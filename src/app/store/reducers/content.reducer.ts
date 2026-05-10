import { createReducer, on } from '@ngrx/store';
import {
  // loadCurrentContentFromData,
  loadPage,
  loadPageFailure,
  loadPageSuccess,
  loadTopContentsSuccess,
  updateRecentVisited,
} from '../actions/content.actions';

export interface ContentState {
  topContents: any[];
  recentContent: any;
  currentContent: any;
  currentContentLoading: boolean;
  currentContentError: any;
}
export const initialState: ContentState = {
  topContents: [],
  recentContent: [],
  currentContent: null,
  currentContentLoading: false,
  currentContentError: null,
};

export const contentReducer = createReducer(
  initialState,
  on(loadTopContentsSuccess, (state, { topContents }) => ({
    ...state,
    topContents: topContents,
  })),
  on(loadPage, (state) => ({
    ...state,
    currentContent: null,
    currentContentLoading: true,
    currentContentError: null,
  })),
  on(loadPageSuccess, (state, { page }) => ({
    ...state,
    currentContent: page,
    currentContentLoading: false,
    currentContentError: null,
  })),
  on(loadPageFailure, (state, { error }) => ({
    ...state,
    currentContent: null,
    currentContentLoading: false,
    currentContentError: error,
  })),
  // on(updateRecentVisited, (state, { recentContent }) => ({
  //   ...state,
  //   recentContent: recentContent,
  // })),
  // on(loadCurrentContentFromData, (state, { currentContent }) => ({
  //   ...state,
  //   currentContent: currentContent,
  // }))
);
