
// Basic In-Memory DB
class Database {
    constructor() {
        this.recordings = {};
    }

    save(r) { this.recordings[r.id] = r; }
    get(id) { return this.recordings[id]; }
    getAll() { return Object.values(this.recordings).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
}
export const db = new Database();
