import { createAction, props } from '@ngrx/store';
import { Content } from '../../model/content.model';

/* =========================================================
   CONTENT ACTION TYPES
   ========================================================= */

export enum ContentActionTypes {
  /* -------------------- LOAD -------------------- */
  loadTopContents = '[Content] Load Top Contents',
  loadTopContentsSuccess = '[Content] Load Top Contents Success',
  loadTopContentsFailure = '[Content] Load Top Contents Failure',

  loadPage = '[Content] Load Page',
  loadPageSuccess = '[Content] Load Page Success',
  loadPageFailure = '[Content] Load Page Failure',

  loadRecentVisited = '[Content] Load Recent Visited',
  loadRecentVisitedSuccess = '[Content] Load Recent Visited Success',
  loadRecentVisitedFailure = '[Content] Load Recent Visited Failure',

  loadCurrentContent = '[Content] Load Current Content',
  loadCurrentContentSuccess = '[Content] Load Current Content Success',
  loadCurrentContentFailure = '[Content] Load Current Content Failure',

  /* -------------------- UPDATE -------------------- */
  updateRecentVisited = '[Content] Update Recent Visited',
  updateRecentVisitedSuccess = '[Content] Update Recent Visited Success',
  updateRecentVisitedFailure = '[Content] Update Recent Visited Failure',
}

/* =========================================================
   ACTIONS
   ========================================================= */

/* ---------- TOP CONTENT ---------- */

export const loadTopContents = createAction(
  ContentActionTypes.loadTopContents
);

export const loadTopContentsSuccess = createAction(
  ContentActionTypes.loadTopContentsSuccess,
  props<{ topContents: Content[] }>()
);

export const loadTopContentsFailure = createAction(
  ContentActionTypes.loadTopContentsFailure,
  props<{ error: any }>()
);

/* ---------- CURRENT PAGE ---------- */

export const loadPage = createAction(
  ContentActionTypes.loadPage,
  props<{ pageId: string }>()
);

export const loadPageSuccess = createAction(
  ContentActionTypes.loadPageSuccess,
  props<{ page: any }>()
);

export const loadPageFailure = createAction(
  ContentActionTypes.loadPageFailure,
  props<{ error: any }>()
);

/* ---------- RECENT VISITED ---------- */

export const loadRecentVisited = createAction(
  ContentActionTypes.loadRecentVisited
);

export const loadRecentVisitedSuccess = createAction(
  ContentActionTypes.loadRecentVisitedSuccess,
  props<{ recentContents: Content[] }>()
);

export const loadRecentVisitedFailure = createAction(
  ContentActionTypes.loadRecentVisitedFailure,
  props<{ error: any }>()
);

/* ---------- CURRENT CONTENT ---------- */

export const loadCurrentContent = createAction(
  ContentActionTypes.loadCurrentContent,
  props<{ contentId: string }>()
);

export const loadCurrentContentSuccess = createAction(
  ContentActionTypes.loadCurrentContentSuccess,
  props<{ currentContent: Content }>()
);

export const loadCurrentContentFailure = createAction(
  ContentActionTypes.loadCurrentContentFailure,
  props<{ error: any }>()
);

/* ---------- UPDATE VISITS ---------- */

export const updateRecentVisited = createAction(
  ContentActionTypes.updateRecentVisited,
  props<{ contentId: string }>()
);

export const updateRecentVisitedSuccess = createAction(
  ContentActionTypes.updateRecentVisitedSuccess,
  props<{ content: Content }>()
);

export const updateRecentVisitedFailure = createAction(
  ContentActionTypes.updateRecentVisitedFailure,
  props<{ error: any }>()
);
