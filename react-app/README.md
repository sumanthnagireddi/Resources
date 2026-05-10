# React App Starter

This folder is the source for the React bundle that Angular loads from:

```text
src/assets/my-react-app.js
```

## Commands

```bash
npm start
npm run react:build
npm run react:dev
```

`npm start` runs the React watcher and Angular dev server together.
`react:build` writes a production bundle once.
`react:dev` watches `react-app/src` and rewrites the bundle as you edit.

The Angular app already includes `src/assets/my-react-app.js` in `angular.json`, and the route `/react-playground` mounts it.
