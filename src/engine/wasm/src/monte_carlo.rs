use rand::prelude::*;
use rand_distr::{Normal, LogNormal, Uniform, Gamma, Beta, Distribution as RandDistribution};
use std::collections::HashMap;
use crate::bdd::{BDDEngine, NodeId, TRUE_ID, FALSE_ID};
use hashbrown::HashMap as FastHashMap;

pub struct MonteCarloEngine {
    pub trials: usize,
    pub rng: SmallRng,
}

impl MonteCarloEngine {
    pub fn new(trials: usize) -> Self {
        Self {
            trials,
            rng: SmallRng::from_entropy(),
        }
    }

    pub fn sample_lognormal(&mut self, median: f64, error_factor: f64) -> f64 {
        let sigma = error_factor.ln() / 1.645;
        let mu = median.ln();
        let d = LogNormal::new(mu, sigma).unwrap();
        d.sample(&mut self.rng)
    }

    pub fn sample_normal(&mut self, mean: f64, std_dev: f64) -> f64 {
        let d = Normal::new(mean, std_dev).unwrap();
        d.sample(&mut self.rng).max(0.0)
    }

    pub fn run_simulation(
        &mut self,
        engine: &BDDEngine,
        root: NodeId,
        base_probs: &HashMap<String, f64>,
        distributions: &HashMap<String, (String, f64, f64)>, // (type, param1, param2)
    ) -> Vec<f64> {
        let mut results = Vec::with_capacity(self.trials);

        for _ in 0..self.trials {
            let mut sampled_probs = HashMap::new();
            
            for (id, prob) in base_probs {
                if let Some((dist_type, p1, p2)) = distributions.get(id) {
                    let val = match dist_type.as_str() {
                        "lognormal" => self.sample_lognormal(*prob, *p1),
                        "normal" => self.sample_normal(*prob, *p1),
                        "uniform" => {
                            let d = Uniform::new(*p1, *p2);
                            d.sample(&mut self.rng)
                        },
                        _ => *prob,
                    };
                    sampled_probs.insert(id.clone(), val.min(1.0));
                } else {
                    sampled_probs.insert(id.clone(), *prob);
                }
            }

            let mut prob_cache = FastHashMap::new();
            let prob = engine.calculate_probability(root, &sampled_probs, &mut prob_cache);
            results.push(prob);
        }

        results
    }
}
