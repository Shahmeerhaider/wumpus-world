// ============================================
// PROPOSITIONAL LOGIC KNOWLEDGE BASE
// WITH CNF CONVERSION & RESOLUTION REFUTATION
// ============================================

class KnowledgeBase {
    constructor() {
        this.clauses = [];
        this.totalSteps = 0;
    }

    // TELL: Add clause(s) to KB (stores in CNF)
    tell(clause) {
        if (Array.isArray(clause[0])) {
            for (const c of clause) this.addClause(c);
        } else {
            this.addClause(clause);
        }
    }

    addClause(clause) {
        const norm = this.normalize(clause);
        if (norm.length > 0 && !this.exists(norm)) {
            this.clauses.push(norm);
        }
    }

    // Normalize: remove duplicates, sort, detect tautologies
    normalize(clause) {
        const unique = [...new Set(clause)];
        for (const lit of unique) {
            if (unique.includes(this.negate(lit))) return [];
        }
        return unique.sort();
    }

    negate(literal) {
        return literal.startsWith('¬') ? literal.slice(1) : '¬' + literal;
    }

    exists(clause) {
        const s = clause.sort();
        return this.clauses.some(c => c.length === s.length && c.every(l => s.includes(l)));
    }

    // Resolution on two clauses
    resolvePair(c1, c2) {
        const resolvents = [];
        for (const lit1 of c1) {
            const negLit = this.negate(lit1);
            if (c2.includes(negLit)) {
                const resolvent = [];
                for (const l of c1) if (l !== lit1) resolvent.push(l);
                for (const l of c2) if (l !== negLit && !resolvent.includes(l)) resolvent.push(l);
                resolvents.push(this.normalize(resolvent));
            }
        }
        return resolvents;
    }

    // ASK: Resolution Refutation — prove query is entailed by KB
    ask(query) {
        this.totalSteps = 0;
        let clauses = this.clauses.map(c => [...c]);
        clauses.push([this.negate(query)]);

        for (let iter = 0; iter < 300; iter++) {
            const newClauses = [];
            for (let i = 0; i < clauses.length; i++) {
                for (let j = i + 1; j < clauses.length; j++) {
                    this.totalSteps++;
                    for (const res of this.resolvePair(clauses[i], clauses[j])) {
                        if (res.length === 0) return true; // Empty clause = contradiction
                        if (!this.inList(res, clauses) && !this.inList(res, newClauses)) {
                            newClauses.push(res);
                        }
                    }
                }
            }
            if (newClauses.length === 0) return false;
            clauses = clauses.concat(newClauses);
        }
        return false;
    }

    inList(clause, list) {
        const s = clause.sort();
        return list.some(c => c.length === s.length && c.every(l => s.includes(l)));
    }

    getClausesHTML() {
        return this.clauses.map(c => c.join(' ∨ ')).join('<br>');
    }

    getCount() { return this.clauses.length; }
    getSteps() { return this.totalSteps; }
    reset() { this.clauses = []; this.totalSteps = 0; }
}

// ============================================
// WUMPUS WORLD ENVIRONMENT
// ============================================

class WumpusWorld {
    constructor(rows, cols, numPits) {
        this.rows = rows;
        this.cols = cols;
        this.pits = new Set();
        this.wumpus = null;
        this.agent = { row: 0, col: 0 };
        this.visited = new Set(['0,0']);
        this.safeCells = new Set(['0,0']);
        this.gameOver = false;
        this.result = '';
        this.kb = new KnowledgeBase();

        // Start cell is known safe
        this.kb.tell(['¬P0_0']);
        this.kb.tell(['¬W0_0']);
        this.generateHazards(numPits);
    }

    generateHazards(numPits) {
        const cells = [];
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++)
                if (r !== 0 || c !== 0) cells.push({ row: r, col: c });

        // Fisher-Yates shuffle
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }

        this.wumpus = cells[0];
        const maxPits = Math.min(numPits, cells.length - 1);
        for (let i = 1; i <= maxPits; i++) this.pits.add(`${cells[i].row},${cells[i].col}`);
    }

    getNeighbors(row, col) {
        const n = [];
        if (row > 0) n.push({ row: row - 1, col });
        if (row < this.rows - 1) n.push({ row: row + 1, col });
        if (col > 0) n.push({ row, col: col - 1 });
        if (col < this.cols - 1) n.push({ row, col: col + 1 });
        return n;
    }

    getPercepts(row, col) {
        let breeze = false, stench = false;
        for (const n of this.getNeighbors(row, col)) {
            if (this.pits.has(`${n.row},${n.col}`)) breeze = true;
            if (this.wumpus && this.wumpus.row === n.row && this.wumpus.col === n.col) stench = true;
        }
        return { breeze, stench };
    }

    // TELL KB using equivalence: B_r,c ⇔ P_n1 ∨ P_n2 ∨ ... and S_r,c ⇔ W_n1 ∨ W_n2 ∨ ...
    tellPercepts(row, col) {
        const p = this.getPercepts(row, col);
        const nb = this.getNeighbors(row, col);

        if (p.breeze) {
            // Breeze → at least one neighbor has pit
            this.kb.tell(nb.map(n => `P${n.row}_${n.col}`));
        } else {
            // No breeze → no pit in any neighbor (also marks them safe)
            for (const n of nb) {
                this.kb.tell([`¬P${n.row}_${n.col}`]);
                this.safeCells.add(`${n.row},${n.col}`);
            }
        }

        if (p.stench) {
            // Stench → at least one neighbor has wumpus
            this.kb.tell(nb.map(n => `W${n.row}_${n.col}`));
        } else {
            // No stench → no wumpus in any neighbor
            for (const n of nb) {
                this.kb.tell([`¬W${n.row}_${n.col}`]);
                this.safeCells.add(`${n.row},${n.col}`);
            }
        }

        // Current cell is safe (agent is standing here alive)
        this.kb.tell([`¬P${row}_${col}`]);
        this.kb.tell([`¬W${row}_${col}`]);
        this.safeCells.add(`${row},${col}`);
        return p;
    }

    // ASK KB to prove ¬P and ¬W for a cell
    isCellSafe(row, col) {
        const key = `${row},${col}`;
        if (this.safeCells.has(key)) return { safe: true, noPit: true, noWumpus: true };
        const noPit = this.kb.ask(`P${row}_${col}`);
        const noWumpus = this.kb.ask(`W${row}_${col}`);
        if (noPit && noWumpus) this.safeCells.add(key);
        return { safe: noPit && noWumpus, noPit, noWumpus };
    }

    moveTo(row, col) {
        this.agent = { row, col };
        this.visited.add(`${row},${col}`);

        if (this.pits.has(`${row},${col}`)) {
            this.gameOver = true;
            this.result = 'Agent fell into a pit!';
            return { over: true };
        }
        if (this.wumpus && this.wumpus.row === row && this.wumpus.col === col) {
            this.gameOver = true;
            this.result = 'Agent was eaten by the Wumpus!';
            return { over: true };
        }

        const p = this.tellPercepts(row, col);
        return { over: false, percepts: p };
    }

    getAdjacentSafeUnvisited() {
        const safe = [];
        for (const n of this.getNeighbors(this.agent.row, this.agent.col)) {
            if (!this.visited.has(`${n.row},${n.col}`)) {
                const result = this.isCellSafe(n.row, n.col);
                if (result.safe) safe.push(n);
            }
        }
        return safe;
    }
}

// ============================================
// UI CONTROLLER
// ============================================

class UIController {
    constructor() {
        this.world = null;
        this.autoTimer = null;
        this.cacheDom();
        this.bindEvents();
    }

    cacheDom() {
        this.rowsInput = document.getElementById('rows');
        this.colsInput = document.getElementById('cols');
        this.numPitsInput = document.getElementById('numPits');
        this.gridDiv = document.getElementById('grid');
        this.gameStatus = document.getElementById('gameStatus');
        this.inferenceStepsSpan = document.getElementById('inferenceSteps');
        this.currentPerceptsSpan = document.getElementById('currentPercepts');
        this.cellsVisitedSpan = document.getElementById('cellsVisited');
        this.safeCellsFoundSpan = document.getElementById('safeCellsFound');
        this.kbClausesSpan = document.getElementById('kbClauses');
        this.kbDisplay = document.getElementById('kbDisplay');
        this.messageLog = document.getElementById('messageLog');
    }

    bindEvents() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('autoExploreBtn').addEventListener('click', () => this.autoExplore());
        document.getElementById('resetBtn').addEventListener('click', () => this.newGame());
        this.gridDiv.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (cell && this.world && !this.world.gameOver) {
                this.handleMove(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
            }
        });
    }

    newGame() {
        this.stopAutoExplore();
        const rows = Math.max(3, Math.min(8, parseInt(this.rowsInput.value) || 4));
        const cols = Math.max(3, Math.min(8, parseInt(this.colsInput.value) || 4));
        const pits = Math.max(1, Math.min(8, parseInt(this.numPitsInput.value) || 2));
        this.rowsInput.value = rows;
        this.colsInput.value = cols;
        this.numPitsInput.value = pits;

        this.world = new WumpusWorld(rows, cols, pits);
        this.world.tellPercepts(0, 0);
        this.renderGrid();
        this.updateMetrics();
        this.messageLog.innerHTML = '';
        this.log('New game: ' + rows + 'x' + cols + ' grid, ' + pits + ' pits, 1 Wumpus', 'info');
        this.log('KB initialized: ¬P_0_0, ¬W_0_0', 'kb');
        this.gameStatus.textContent = 'Click cells manually or use Auto Explore';
    }

    handleMove(row, col) {
        if (this.world.gameOver) return;
        const isAdj = this.world.getNeighbors(this.world.agent.row, this.world.agent.col)
            .some(n => n.row === row && n.col === col);
        const isCurr = this.world.agent.row === row && this.world.agent.col === col;
        if (!isAdj && !isCurr) { this.log('Can only move to adjacent cells', 'warning'); return; }

        if (!this.world.visited.has(`${row},${col}`)) {
            const { safe, noPit, noWumpus } = this.world.isCellSafe(row, col);
            if (!safe) {
                if (!noPit) this.log('ASK: Cannot prove ¬P' + row + '_' + col + ' — Pit may be present!', 'danger');
                if (!noWumpus) this.log('ASK: Cannot prove ¬W' + row + '_' + col + ' — Wumpus may be present!', 'danger');
            } else {
                this.log('ASK: Proved ¬P' + row + '_' + col + ' ∧ ¬W' + row + '_' + col + ' — Cell is SAFE', 'kb');
            }
        }

        const result = this.world.moveTo(row, col);
        if (result.over) {
            this.log(this.world.result, 'danger');
            this.gameStatus.textContent = this.world.result;
        } else {
            const p = result.percepts;
            const list = [];
            if (p.breeze) list.push('Breeze');
            if (p.stench) list.push('Stench');
            this.log('Moved to (' + row + ',' + col + ') | Percepts: ' + (list.length ? list.join(', ') : 'None'), 'success');
        }
        this.renderGrid();
        this.updateMetrics();
    }

    autoExplore() {
        this.stopAutoExplore();
        if (!this.world || this.world.gameOver) { this.newGame(); }
        this.log('Auto Explore started — proving safety before each move...', 'info');

        const step = () => {
            if (this.world.gameOver) {
                this.log('Done: ' + this.world.result, this.world.result.includes('pit') || this.world.result.includes('eaten') ? 'danger' : 'success');
                this.gameStatus.textContent = this.world.result;
                this.renderGrid();
                this.updateMetrics();
                return;
            }
            const safeMoves = this.world.getAdjacentSafeUnvisited();
            if (safeMoves.length === 0) {
                this.log('No adjacent safe unvisited cells. Exploration complete.', 'warning');
                this.gameStatus.textContent = 'No more safe adjacent cells';
                this.renderGrid();
                this.updateMetrics();
                return;
            }
            const next = safeMoves[0];
            this.log('KB proves (' + next.row + ',' + next.col + ') is safe. Moving...', 'kb');
            const result = this.world.moveTo(next.row, next.col);
            if (result.over) {
                this.log(this.world.result, 'danger');
                this.gameStatus.textContent = this.world.result;
                this.renderGrid();
                this.updateMetrics();
                return;
            }
            this.renderGrid();
            this.updateMetrics();
            this.autoTimer = setTimeout(step, 400);
        };
        this.autoTimer = setTimeout(step, 200);
    }

    stopAutoExplore() {
        if (this.autoTimer) { clearTimeout(this.autoTimer); this.autoTimer = null; }
    }

    renderGrid() {
        this.gridDiv.innerHTML = '';
        this.gridDiv.style.gridTemplateColumns = `repeat(${this.world.cols}, 1fr)`;

        for (let r = 0; r < this.world.rows; r++) {
            for (let c = 0; c < this.world.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                const key = `${r},${c}`;
                const isAgent = this.world.agent.row === r && this.world.agent.col === c;
                const isVisited = this.world.visited.has(key);
                const isSafe = this.world.safeCells.has(key);

                if (this.world.gameOver) {
                    if (this.world.pits.has(key)) { cell.classList.add('pit-revealed'); cell.textContent = 'P'; }
                    else if (this.world.wumpus && this.world.wumpus.row === r && this.world.wumpus.col === c) { cell.classList.add('wumpus-revealed'); cell.textContent = 'W'; }
                    else if (isAgent) { cell.classList.add('agent'); cell.textContent = 'A'; }
                    else if (isVisited) cell.classList.add('visited');
                    else if (isSafe) cell.classList.add('safe');
                    else cell.classList.add('unknown');
                } else {
                    if (isAgent) { cell.classList.add('agent'); cell.textContent = 'A'; }
                    else if (isVisited) {
                        cell.classList.add('visited');
                        const pt = this.world.getPercepts(r, c);
                        if (pt.breeze) { const b = document.createElement('span'); b.className = 'breeze-tag'; b.textContent = 'B'; cell.appendChild(b); }
                        if (pt.stench) { const s = document.createElement('span'); s.className = 'stench-tag'; s.textContent = 'S'; cell.appendChild(s); }
                    }
                    else if (isSafe) { cell.classList.add('safe'); cell.textContent = '✓'; }
                    else { cell.classList.add('unknown'); cell.textContent = '?'; }
                }
                this.gridDiv.appendChild(cell);
            }
        }
    }

    updateMetrics() {
        this.inferenceStepsSpan.textContent = this.world.kb.getSteps();
        const p = this.world.getPercepts(this.world.agent.row, this.world.agent.col);
        const list = [];
        if (p.breeze) list.push('Breeze');
        if (p.stench) list.push('Stench');
        this.currentPerceptsSpan.textContent = list.length ? list.join(', ') : 'None';
        this.cellsVisitedSpan.textContent = this.world.visited.size;
        this.safeCellsFoundSpan.textContent = this.world.safeCells.size;
        this.kbClausesSpan.textContent = this.world.kb.getCount();
        this.kbDisplay.innerHTML = this.world.kb.getClausesHTML();
    }

    log(msg, type = 'info') {
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
        this.messageLog.appendChild(entry);
        this.messageLog.scrollTop = this.messageLog.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new UIController();
    app.newGame();
});