import fs from 'fs';
import { quantifyFaultTree } from '@/engine/bdd';

const modelPath = 'C:\\Users\\User\\Downloads\\large_scale_test_model.json';

try {
  console.log('1. モデルデータをロード中...');
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  
  // 1番目のフォルトツリー (FT_01) の定量化を走らせてみます
  const targetFT = model.faultTrees[0];
  console.log(`2. フォルトツリー ${targetFT.name} の定量化テストを開始します...`);
  
  const result = quantifyFaultTree(
    targetFT,
    model.basicEvents,
    model.parameters || [],
    model.ccfGroups || [],
    model.faultTrees
  );
  
  console.log('✅ 定量化成功！');
  console.log('結果確率:', result.topEventProbability);
  console.log('計算時間:', result.computeTimeMs, 'ms');
  console.log('カットセット数:', result.cutSets.length);
  
} catch (error) {
  console.error('❌ 定量化中にエラーが発生しました！');
  console.error(error);
}
