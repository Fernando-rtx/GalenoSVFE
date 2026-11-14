/** Coordina lecturas independientes y descarta respuestas anteriores por ámbito. */
export default class AcademicCareControl {
  constructor() { this.requests = new Map(); }
  async read(scope, work) {
    this.requests.get(scope)?.abort();
    const controller = new AbortController();
    this.requests.set(scope, controller);
    try {
      const response = await work({ signal: controller.signal });
      if (controller.signal.aborted || this.requests.get(scope) !== controller) return null;
      return response;
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError' || error.code === 'CANCELLED') return null;
      throw error;
    } finally {
      if (this.requests.get(scope) === controller) this.requests.delete(scope);
    }
  }
  cancel() { for (const request of this.requests.values()) request.abort(); this.requests.clear(); }
}
