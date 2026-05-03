# 🐺 Wumpus World — Knowledge-Based AI Agent

A web-based **Wumpus World** simulation where an intelligent agent navigates a hazardous grid using **Propositional Logic** and **Resolution Refutation** to deduce safe cells before moving.

---

## 🚀 Live Demo

🔗 [(https://shahmeerhaider.github.io/wumpus-world/)]




---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 🎛️ **Dynamic Grid Sizing** | User can set grid dimensions (Rows × Columns) before each episode |
| 🎲 **Random Hazard Placement** | Pits and Wumpus are randomly placed at the start of every game |
| 💨 **Breeze Percept** | Agent senses a breeze when adjacent to a pit |
| 💀 **Stench Percept** | Agent senses a stench when adjacent to the Wumpus |
| 🧠 **Knowledge Base (KB)** | Maintains propositional logic clauses in CNF |
| 📝 **TELL Operation** | Updates KB with percept rules (e.g., B₂,₁ ⇔ P₂,₂ ∨ P₃,₁ ∨ P₁,₁) |
| 🔍 **ASK Operation** | Queries KB via resolution refutation to prove cell safety |
| ⚡ **Resolution Refutation** | Automated theorem prover — resolves clauses until contradiction |
| ✅ **Safe Cell Deduction** | Proves ¬P ∧ ¬W before moving to any unvisited adjacent cell |
| 🎨 **Visual Grid** | Color-coded cells with percept indicators |
| 📊 **Real-Time Metrics** | Live display of inference steps, percepts, visits, KB size |
| 🤖 **Auto Explore** | Automated safe exploration using KB reasoning |
| 📜 **Action Log** | Timestamped log of all agent actions and KB operations |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Page structure and layout |
| **CSS3** | Styling, animations, responsive design |
| **Vanilla JavaScript (ES6+)** | Game logic, KB engine, resolution algorithm, UI controller |
| **Vercel** | Live deployment |

> No external libraries or frameworks — pure vanilla implementation.

---

