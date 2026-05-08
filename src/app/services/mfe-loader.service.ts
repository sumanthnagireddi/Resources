import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MfeLoaderService {
  private readonly pendingLoads = new Map<string, Promise<void>>();

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  loadModuleScript(key: string, src: string, tagName?: string): Promise<void> {
    if (tagName && this.document.defaultView?.customElements.get(tagName)) {
      return Promise.resolve();
    }

    const existingLoad = this.pendingLoads.get(key);
    if (existingLoad) {
      return existingLoad;
    }

    const existingScript = this.document.querySelector<HTMLScriptElement>(
      `script[data-mfe-key="${key}"]`,
    );

    if (existingScript) {
      const readyPromise = Promise.resolve();
      this.pendingLoads.set(key, readyPromise);
      return readyPromise;
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.type = 'module';
      script.src = src;
      script.async = true;
      script.dataset['mfeKey'] = key;

      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error(`Failed to load micro frontend bundle: ${src}`));

      this.document.head.appendChild(script);
    });

    this.pendingLoads.set(key, loadPromise);
    return loadPromise;
  }
}
