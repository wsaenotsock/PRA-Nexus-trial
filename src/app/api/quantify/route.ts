import { NextResponse } from 'next/server';
import { quantifyFaultTree } from '@/engine/bdd';
import { quantifyEventTree } from '@/engine/et_quant';
import { quantifySeismic } from '@/engine/seismic_quant';
import { runMonteCarlo, UncertaintyResult } from '@/engine/monte_carlo';
import { calculateSensitivity } from '@/engine/sensitivity';
import { BDDNode, bddOr, FALSE_NODE } from '@/engine/bdd';
import { QuantificationResult } from '@/lib/types';

// Removes circular or highly nested objects before sending back to main thread
function cleanResult(res: QuantificationResult): any {
  const cleaned = { ...res };
  delete cleaned.totalRiskBDD;
  delete cleaned.sequenceBDDs;
  return cleaned;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function addCorsHeaders(response: NextResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request) {
  try {
    const { type, payload } = await request.json();

    if (!type) {
      return addCorsHeaders(NextResponse.json({ error: 'Missing calculation type' }, { status: 400 }));
    }

    console.log(`[Server API] Processing calculation: ${type}`);

    switch (type) {
      case 'QUANTIFY_FT': {
        const { model, targetId } = payload;
        if (!model) throw new Error('Model is missing in payload');
        const ft = (model.faultTrees || []).find((f: any) => f.id === targetId);
        if (!ft) throw new Error(`Fault Tree not found: ${targetId}`);

        const cutoffValue = model.quantificationSettings?.cutOff ?? 1e-15;
        const maxCutsetsValue = model.quantificationSettings?.maxCutsets ?? 3000;
        const res = quantifyFaultTree(
          ft,
          model.basicEvents || [],
          model.parameters || [],
          model.ccfGroups || [],
          model.faultTrees || [],
          cutoffValue,
          maxCutsetsValue
        );
        res.cutoff = cutoffValue;
        const finalRes = { ...res, isFaultTree: true, targetId } as any;
        return addCorsHeaders(NextResponse.json({ result: cleanResult(finalRes) }));
      }

      case 'QUANTIFY_ET': {
        const { model, targetId } = payload;
        if (!model) throw new Error('Model is missing in payload');
        const et = (model.eventTrees || []).find((e: any) => e.id === targetId);
        if (!et) throw new Error(`Event Tree not found: ${targetId}`);

        const res = quantifyEventTree(et, model);
        res.cutoff = model.quantificationSettings?.cutOff;
        const finalRes = { ...res, isFaultTree: false, targetId } as any;
        return addCorsHeaders(NextResponse.json({ result: cleanResult(finalRes) }));
      }

      case 'QUANTIFY_SEISMIC': {
        const { model } = payload;
        if (!model) throw new Error('Model is missing in payload');
        const res = quantifySeismic('', model);
        return addCorsHeaders(NextResponse.json({ result: cleanResult(res) }));
      }

      case 'RUN_MONTE_CARLO': {
        const { targetType, targetId, trials, useLHS, model, currentResult } = payload;
        if (!model) throw new Error('Model is missing in payload');
        if (!currentResult) throw new Error('No active quantification result found.');

        let targetBDD: BDDNode = FALSE_NODE;

        // BDDNode regeneration on server-side if circular references were stripped:
        // Since cleanResult strips totalRiskBDD and sequenceBDDs to pass via JSON,
        // we must run FT or ET quantification first to get the local BDD nodes!
        let fullResult: QuantificationResult;
        const isFT = currentResult.isFaultTree ?? (model.faultTrees || []).some((f: any) => f.id === (currentResult.targetId || currentResult.id));
        if (isFT) {
          const ft = (model.faultTrees || []).find((f: any) => f.id === (currentResult.targetId || currentResult.id));
          fullResult = quantifyFaultTree(
            ft,
            model.basicEvents || [],
            model.parameters || [],
            model.ccfGroups || [],
            model.faultTrees || [],
            model.quantificationSettings?.cutOff ?? 1e-15,
            model.quantificationSettings?.maxCutsets ?? 3000
          );
        } else {
          const et = (model.eventTrees || []).find((e: any) => e.id === currentResult.targetId);
          fullResult = quantifyEventTree(et, model);
        }

        if (targetType === 'total') {
          targetBDD = fullResult.totalRiskBDD;
        } else if (targetType === 'category' && targetId) {
          const seqsToOr = fullResult.sequenceResults?.filter((sr: any) => {
            const ets = model.eventTrees;
            for (const et of ets) {
              const seq = et.sequences.find(s => s.id === sr.sequenceId);
              if (seq) {
                const es = model.endStates.find(e => e.id === seq.endStateId);
                return es?.categories?.includes(targetId);
              }
            }
            return false;
          }).map((sr: any) => sr.sequenceId) || [];

          for (const seqId of seqsToOr) {
            const bdd = fullResult.sequenceBDDs?.[seqId];
            if (bdd) targetBDD = bddOr(targetBDD, bdd);
          }
        } else if (targetType === 'endstate' && targetId) {
          const seqsToOr = fullResult.sequenceResults?.filter((sr: any) => {
            const ets = model.eventTrees;
            for (const et of ets) {
              const seq = et.sequences.find(s => s.id === sr.sequenceId);
              if (seq && seq.endStateId === targetId) return true;
            }
            return false;
          }).map((sr: any) => sr.sequenceId) || [];

          for (const seqId of seqsToOr) {
            const bdd = fullResult.sequenceBDDs?.[seqId];
            if (bdd) targetBDD = bddOr(targetBDD, bdd);
          }
        }

        if (targetBDD === FALSE_NODE && targetType !== 'total') {
          return addCorsHeaders(NextResponse.json({ result: null }));
        }

        const mcRes = runMonteCarlo(targetBDD, model, undefined, trials, useLHS, fullResult.baseProbabilities);
        return addCorsHeaders(NextResponse.json({ result: mcRes }));
      }

      case 'RUN_SENSITIVITY': {
        const { targetEvents, options, model, currentResult } = payload;
        if (!model || !currentResult) throw new Error('No active quantification or model available.');

        // Re-generate full result with BDD for sensitivity calculation
        let fullResult: QuantificationResult;
        const isFT = currentResult.isFaultTree ?? (model.faultTrees || []).some((f: any) => f.id === (currentResult.targetId || currentResult.id));
        if (isFT) {
          const ft = (model.faultTrees || []).find((f: any) => f.id === (currentResult.targetId || currentResult.id));
          fullResult = quantifyFaultTree(
            ft,
            model.basicEvents || [],
            model.parameters || [],
            model.ccfGroups || [],
            model.faultTrees || [],
            model.quantificationSettings?.cutOff ?? 1e-15,
            model.quantificationSettings?.maxCutsets ?? 3000
          );
        } else {
          const et = (model.eventTrees || []).find((e: any) => e.id === currentResult.targetId);
          fullResult = quantifyEventTree(et, model);
        }

        if (!fullResult.totalRiskBDD || !fullResult.baseProbabilities) {
          throw new Error('No BDD or base probabilities available.');
        }

        const sRes = calculateSensitivity(fullResult.totalRiskBDD, fullResult.baseProbabilities, targetEvents, options);
        return addCorsHeaders(NextResponse.json({ result: sRes }));
      }

      default:
        return addCorsHeaders(NextResponse.json({ error: `Unknown calculation type: ${type}` }, { status: 400 }));
    }
  } catch (error: any) {
    console.error(`[Server API Error]: ${error.message}`);
    return addCorsHeaders(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}
