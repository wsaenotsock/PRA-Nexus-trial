import type { PRAModel } from '@/lib/types';
import type { ProjectDiff } from '@/lib/types/project';

/**
 * Applies a single diff's value to a PRAModel.
 * Used for restoring historical values or merging branches.
 * 
 * @param model Current PRAModel (will be deep cloned and mutated)
 * @param diff The diff to apply
 * @param useOldValue If true, applies diff.oldValue (e.g., restore from history)
 * @returns A new PRAModel with the applied patch
 */
export function applyDiffToModel(model: PRAModel, diff: ProjectDiff, useOldValue: boolean = true): PRAModel {
  const newModel = JSON.parse(JSON.stringify(model)) as any;
  const targetValue = useOldValue ? diff.oldValue : diff.newValue;
  
  // If we are restoring from a state where the property didn't exist, targetValue will be undefined.
  const isDeleteAction = targetValue === undefined || targetValue === null;

  const parts = diff.path.split('.');
  let current = newModel;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Check if part contains an array index lookup like `prop[id]`
    const match = part.match(/(.+)\[(.+)\]/);
    
    if (match) {
      const prop = match[1];
      const id = match[2];
      
      const arr = current[prop] as any[];
      if (!arr) {
        if (isDeleteAction) return newModel; // Already gone
        current[prop] = [];
      }
      
      const index = current[prop].findIndex((item: any) => item.id === id);
      
      if (i === parts.length - 1) {
        // Target is the array item itself (e.g., adding/deleting a whole BasicEvent)
        if (isDeleteAction) {
          if (index !== -1) current[prop].splice(index, 1);
        } else {
          if (index !== -1) {
            current[prop][index] = targetValue;
          } else {
            current[prop].push(targetValue);
          }
        }
      } else {
        // Traverse deeper into the object
        if (index !== -1) {
          current = current[prop][index];
        } else {
          console.warn(`[ModelMerge] Cannot apply diff: parent ${prop}[${id}] not found.`);
          return newModel;
        }
      }
    } else {
      // Standard property path
      if (i === parts.length - 1) {
         if (isDeleteAction) {
           delete current[part];
         } else {
           current[part] = targetValue;
         }
      } else {
         if (!current[part]) current[part] = {};
         current = current[part];
      }
    }
  }
  
  return newModel as PRAModel;
}
