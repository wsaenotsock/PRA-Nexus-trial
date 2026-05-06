use std::collections::HashMap;
use hashbrown::HashMap as FastHashMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodeId(pub u32);

pub const TRUE_ID: NodeId = NodeId(u32::MAX);
pub const FALSE_ID: NodeId = NodeId(u32::MAX - 1);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BDDNode {
    pub variable: String,
    pub high: NodeId,
    pub low: NodeId,
}

pub struct BDDEngine {
    pub nodes: Vec<BDDNode>,
    pub cache: FastHashMap<(String, NodeId, NodeId), NodeId>,
    pub apply_cache: FastHashMap<(String, NodeId, NodeId), NodeId>,
}

impl BDDEngine {
    pub fn new() -> Self {
        Self {
            nodes: Vec::with_capacity(1024),
            cache: FastHashMap::with_capacity(1024),
            apply_cache: FastHashMap::with_capacity(1024),
        }
    }

    pub fn make_node(&mut self, variable: String, high: NodeId, low: NodeId) -> NodeId {
        if high == low {
            return high;
        }

        let key = (variable.clone(), high, low);
        if let Some(&id) = self.cache.get(&key) {
            return id;
        }

        let id = NodeId(self.nodes.len() as u32);
        self.nodes.push(BDDNode { variable, high, low });
        self.cache.insert(key, id);
        id
    }

    pub fn and(&mut self, a: NodeId, b: NodeId) -> NodeId {
        if a == FALSE_ID || b == FALSE_ID { return FALSE_ID; }
        if a == TRUE_ID { return b; }
        if b == TRUE_ID { return a; }
        if a == b { return a; }

        let key = ("AND".to_string(), a, b);
        if let Some(&res) = self.apply_cache.get(&key) {
            return res;
        }

        let node_a = &self.nodes[a.0 as usize];
        let node_b = &self.nodes[b.0 as usize];

        let res = if node_a.variable == node_b.variable {
            let h = self.and(node_a.high, node_b.high);
            let l = self.and(node_a.low, node_b.low);
            self.make_node(node_a.variable.clone(), h, l)
        } else if node_a.variable < node_b.variable {
            let h = self.and(node_a.high, b);
            let l = self.and(node_a.low, b);
            self.make_node(node_a.variable.clone(), h, l)
        } else {
            let h = self.and(a, node_b.high);
            let l = self.and(a, node_b.low);
            self.make_node(node_b.variable.clone(), h, l)
        };

        self.apply_cache.insert(key, res);
        res
    }

    pub fn or(&mut self, a: NodeId, b: NodeId) -> NodeId {
        if a == TRUE_ID || b == TRUE_ID { return TRUE_ID; }
        if a == FALSE_ID { return b; }
        if b == FALSE_ID { return a; }
        if a == b { return a; }

        let key = ("OR".to_string(), a, b);
        if let Some(&res) = self.apply_cache.get(&key) {
            return res;
        }

        let node_a = &self.nodes[a.0 as usize];
        let node_b = &self.nodes[b.0 as usize];

        let res = if node_a.variable == node_b.variable {
            let h = self.or(node_a.high, node_b.high);
            let l = self.or(node_a.low, node_b.low);
            self.make_node(node_a.variable.clone(), h, l)
        } else if node_a.variable < node_b.variable {
            let h = self.or(node_a.high, b);
            let l = self.or(node_a.low, b);
            self.make_node(node_a.variable.clone(), h, l)
        } else {
            let h = self.or(a, node_b.high);
            let l = self.or(a, node_b.low);
            self.make_node(node_b.variable.clone(), h, l)
        };

        self.apply_cache.insert(key, res);
        res
    }

    pub fn calculate_probability(&self, root: NodeId, probs: &HashMap<String, f64>, cache: &mut FastHashMap<NodeId, f64>) -> f64 {
        if root == TRUE_ID { return 1.0; }
        if root == FALSE_ID { return 0.0; }

        if let Some(&p) = cache.get(&root) {
            return p;
        }

        let node = &self.nodes[root.0 as usize];
        let p_var = probs.get(&node.variable).cloned().unwrap_or(0.0);
        
        let p_high = self.calculate_probability(node.high, probs, cache);
        let p_low = self.calculate_probability(node.low, probs, cache);
        
        let res = p_var * p_high + (1.0 - p_var) * p_low;
        cache.insert(root, res);
        res
    }
}
