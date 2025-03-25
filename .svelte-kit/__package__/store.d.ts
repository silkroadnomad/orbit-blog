import type { Post, Category, RemoteDB } from './types';
export declare const identity: import("svelte/store").Writable<null>;
export declare const identities: import("svelte/store").Writable<null>;
export declare const settingsDB: import("svelte/store").Writable<null>;
export declare const postsDB: import("svelte/store").Writable<null>;
export declare const initialAddress: import("svelte/store").Writable<string | null>;
export declare const remoteDBs: import("svelte/store").Writable<RemoteDB[]>;
export declare const selectedDBAddress: import("svelte/store").Writable<string | null>;
export declare const remoteDBsDatabases: import("svelte/store").Writable<null>;
export declare const blogName: import("svelte/store").Writable<string>;
export declare const blogDescription: import("svelte/store").Writable<string>;
export declare const categories: import("svelte/store").Writable<string[]>;
export declare const selectedPostId: import("svelte/store").Writable<string | null>;
export declare const postsDBAddress: import("svelte/store").Writable<string | null>;
export declare const seedPhrase: import("svelte/store").Writable<string | null>;
export declare const helia: import("svelte/store").Writable<unknown>;
export declare const libp2p: import("svelte/store").Writable<unknown>;
export declare const orbitdb: import("svelte/store").Writable<unknown>;
export declare const voyager: import("svelte/store").Writable<unknown>;
export declare const showDBManager: import("svelte/store").Writable<any>;
export declare const showPeers: import("svelte/store").Writable<any>;
export declare const showSettings: import("svelte/store").Writable<any>;
export declare const posts: import("svelte/store").Writable<Post[]>;
export declare const searchQuery: import("svelte/store").Writable<string>;
export declare const selectedCategory: import("svelte/store").Writable<Category | "All">;
export declare const commentsDB: import("svelte/store").Writable<null>;
export declare const commentsDBAddress: import("svelte/store").Writable<null>;
export declare const allComments: import("svelte/store").Writable<never[]>;
export declare const mediaDB: import("svelte/store").Writable<null>;
export declare const mediaDBAddress: import("svelte/store").Writable<null>;
export declare const allMedia: import("svelte/store").Writable<never[]>;
//# sourceMappingURL=store.d.ts.map