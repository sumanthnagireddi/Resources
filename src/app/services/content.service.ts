import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  limit,
  Firestore,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
  orderBy,
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class ContentService {
  topics_endpoint: any = environment.API_URL + '/content';
  pages_endpoint: any = environment.API_URL + '/atlassian/pages';
  firestore = inject(Firestore);
  contentCollectionRef = collection(this.firestore, 'content_new');
  contentCollectionRefString = 'content_new';

  constructor(private http: HttpClient) {}
  createContent(contentPayload: any) {
    return this.http.post(this.topics_endpoint, contentPayload);
  }

  fetchPage(pageId: string) {
    return this.http.get(this.pages_endpoint + '/' + pageId);
  }

  fetchContent(contentId: string) {
    return this.http.get(this.topics_endpoint + '/' + contentId);
  }
  updateContent(contentId: string, payload: any) {
    return this.http.patch(this.topics_endpoint + '/' + contentId, payload);
  }
  getContents(){
    return this.http.get(this.topics_endpoint);
  }

  getAllContents(limitCount: number): Observable<any> {
    const docRef = collection(this.firestore, this.contentCollectionRefString);
    const q = query(docRef, limit(limitCount));
    return from(getDocs(q)).pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      )
    );
  }
  getAllRecentViewed(limitCount: number): Observable<any[]> {
    const colRef = collection(this.firestore, this.contentCollectionRefString);

    const q = query(
      colRef,
      where('lastViewed', '!=', null), // ✅ only viewed docs
      orderBy('lastViewed', 'desc'), // ✅ most recent first
      limit(limitCount)
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      )
    );
  }

  addContent(
    contentName: string,
    id: string,
    topicId: string
  ): Observable<any> {
    const docRef = doc(this.firestore, this.contentCollectionRefString, id);
    return from(
      setDoc(
        docRef,
        {
          content: contentName,
          updatedOn: serverTimestamp(),
          lastViewed: serverTimestamp(),
          status: 'Published',
          topicId: topicId,
          isDeleted: false,
        },
        { merge: true }
      )
    );
  }

  updateLastViewed(id: string): Observable<any> {
    const docRef = doc(this.firestore, this.contentCollectionRefString, id);
    return from(
      setDoc(docRef, { lastViewed: serverTimestamp() }, { merge: true })
    );
  }
  updateStarred(id: string): Observable<any> {
    const docRef = doc(this.firestore, this.contentCollectionRefString, id);
    return from(
      setDoc(
        docRef,
        { isStarred: true, updatedOn: serverTimestamp() },
        { merge: true }
      )
    );
  }
  updateUnStarred(id: string): Observable<any> {
    const docRef = doc(this.firestore, this.contentCollectionRefString, id);
    return from(
      setDoc(
        docRef,
        { isStarred: false, updatedOn: serverTimestamp() },
        { merge: true }
      )
    );
  }
}
