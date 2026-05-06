use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

pub mod bdd;
pub mod monte_carlo;

use crate::bdd::{BDDEngine, NodeId, TRUE_ID, FALSE_ID};
use crate::monte_carlo::MonteCarloEngine;

#[wasm_bindgen]
pub struct WASMQuantEngine {
    engine: BDDEngine,
}

#[wasm_bindgen]
impl WASMQuantEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            engine: BDDEngine::new(),
        }
    }

    pub fn build_bdd_node(&mut self, variable: String, high_idx: u32, low_idx: u32) -> u32 {
        let high = if high_idx == u32::MAX { TRUE_ID } else if high_idx == u32::MAX - 1 { FALSE_ID } else { NodeId(high_idx) };
        let low = if low_idx == u32::MAX { TRUE_ID } else if low_idx == u32::MAX - 1 { FALSE_ID } else { NodeId(low_idx) };
        
        let id = self.engine.make_node(variable, high, low);
        id.0
    }

    pub fn bdd_and(&mut self, a_idx: u32, b_idx: u32) -> u32 {
        let a = if a_idx == u32::MAX { TRUE_ID } else { NodeId(a_idx) };
        let b = if b_idx == u32::MAX { TRUE_ID } else { NodeId(b_idx) };
        self.engine.and(a, b).0
    }

    pub fn bdd_or(&mut self, a_idx: u32, b_idx: u32) -> u32 {
        let a = if a_idx == u32::MAX { TRUE_ID } else { NodeId(a_idx) };
        let b = if b_idx == u32::MAX { TRUE_ID } else { NodeId(b_idx) };
        self.engine.or(a, b).0
    }

    pub fn run_monte_carlo(
        &mut self,
        root_idx: u32,
        trials: usize,
        base_probs_js: JsValue,
        distributions_js: JsValue,
    ) -> Vec<f64> {
        let root = if root_idx == u32::MAX { TRUE_ID } else { NodeId(root_idx) };
        let base_probs: HashMap<String, f64> = serde_wasm_bindgen::from_value(base_probs_js).unwrap();
        let distributions: HashMap<String, (String, f64, f64)> = serde_wasm_bindgen::from_value(distributions_js).unwrap();

        let mut mc_engine = MonteCarloEngine::new(trials);
        mc_engine.run_simulation(&self.engine, root, &base_probs, &distributions)
    }
}
