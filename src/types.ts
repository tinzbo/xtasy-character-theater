export type Genre = '日常关系' | '科幻冒险' | '悬疑探索';
export interface Action { id: string; label: string; next: string; keywords: string[]; memory: string; }
export interface StoryNode { id: string; title: string; text: string; caption: string; actions: Action[]; ending?: {title: string; summary: string; tone: string}; }
export interface Character { id: string; name: string; age: number; role: string; genre: Genre; image: string; accent: string; title: string; tagline: string; description: string; goal: string; duration: string; start: string; nodes: StoryNode[]; }
export type Engine = 'choice' | 'jev' | 'rules';
export interface Turn { nodeId: string; text: string; action: string; at: string; engine: Engine; }
export interface Session { id: string; characterId: string; nodeId: string; revision: number; memories: string[]; turns: Turn[]; createdAt: string; updatedAt: string; }
export interface RouteResult { actionId: string | null; engine: Engine; message: string; confidence?: number; }
export interface SessionResult { session: Session; route?: RouteResult; }
