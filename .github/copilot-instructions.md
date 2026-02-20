# Copilot / AI agent instructions for SplitMint

Purpose: give AI coding agents the minimal, actionable knowledge to be productive in this repo.

- **Project type**: Create React App single-page app (see [package.json](package.json)).
- **Entry points**: `src/index.js` → `src/App.js` routes to `src/pages/Home.js`, `src/pages/QuickSplit.js`, `src/pages/TripRoom.js`.

- **Dev / Build commands**:
  - Start dev server: `npm start` (runs `react-scripts start`).
  - Run tests: `npm test`.
  - Build production bundle: `npm run build`.

- **Key integrations**:
  - Firebase Firestore: configured in `src/firebase.js`. The file exports `db` (Firestore instance) used across `TripRoom` for realtime rooms.
  - Google Generative AI (Gemini): wrapper usage in `src/utils/gemini.js`. Important functions:
    - `scanItemizedBill(imageFile)` — returns parsed JSON array [{name, price}] (used by QuickSplit and TripRoom).
    - `scanBill(imageFile)` — older function that returns a single total string (kept for compatibility).

- **Data shapes and conventions (critical)**:
  - Room document (Firestore `rooms/{code}`) contains keys: `title`, `admin`, `members` (array of {name, upi}), `receipts` (array).
  - Receipt object: `{ id, name, items: [], payments: {}, timestamp }`.
  - Item object: `{ id, name, price: number, consumers: [name,...] }`.
  - IDs: generated in code with `Math.random().toString(36).substr(2, N)` — follow this same pattern when adding new IDs.

- **Realtime and write patterns**:
  - Read: `onSnapshot(doc(db, 'rooms', roomCode), callback)` is used in `TripRoom` to keep UI in sync.
  - Write: `updateDoc(doc(db,'rooms', roomCode), { receipts: updatedReceipts })` or `setDoc` when creating a room.
  - When modifying nested arrays (members/receipts/items), code reads the full array, mutates a copy, then writes the array back via `updateDoc`.

- **Business logic**:
  - Settlement algorithm lives in `src/utils/settlement.js` as `minimizeTransactions(balances)`; other UI code expects the output as [{from,to,amount}].
  - UI assumes balances are positive = creditor, negative = debtor; `minimizeTransactions` accepts a map `{name: number}` where positive means owed.

- **UI patterns and local state**:
  - Components are functional React components using hooks (`useState`, `useEffect`, `useRef`).
  - Inline styles are used across `src/pages/*` — follow this simple pattern (no CSS modules used for these pages).
  - Local user identity is stored in `localStorage` under key `sm_user` (see `TripRoom` initialization).

- **Security / secrets**:
  - Repo currently has API keys in `src/firebase.js` and `src/utils/gemini.js`. Do NOT add keys into commits or PR comments; prefer suggesting env var changes (`process.env.REACT_APP_*`) and documenting how to run locally.

- **Editing guidance (practical examples)**:
  - To add a new receipt in `TripRoom`, mirror existing `addNewReceipt()` flow: generate id, build receipt object, `updateDoc(..., { receipts: arrayUnion(newReceipt) })` or write whole receipts array.
  - To add scanned items: call `scanItemizedBill(file)` and map results into `{ ...item, price: Number(item.price), consumers: [], id: genId() }` before merging into the receipt.
  - To adjust consumers of an item: update the `items` array for the matching receipt and `updateDoc` the `receipts` field (follow `toggleConsumer` implementation).

- **Where to check when debugging**:
  - Realtime flow problems: check `src/firebase.js`, ensure `db` import is used and Firestore rules allow read/write for your local user.
  - AI scanning issues: inspect `src/utils/gemini.js` and the prompt. `scanItemizedBill` strips code fences then `JSON.parse()`s result — guard against non-JSON responses.
  - Settlement mismatches: look at `calculateTotalBalances()` in `TripRoom` and `minimizeTransactions()` logic for rounding or sign errors.

- **Quick notes for PRs and edits**:
  - Keep API usage consistent (use `db` export from `src/firebase.js`).
  - Preserve the simple id generation pattern. Avoid introducing large refactors without tests or a manual run locally.
  - When changing data shapes, update both `TripRoom` and `QuickSplit` to keep compatibility.

If anything above is unclear or you want me to expand examples (Firestore read/write snippets, env var migration, or a small test harness), tell me which section to iterate on.
