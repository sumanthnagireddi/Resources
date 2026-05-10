import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Spinner from '@atlaskit/spinner';

export const SurfaceLoader = memo(function SurfaceLoader({
  label,
  compact = false
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`atlas-editor-surface-loader${compact ? ' atlas-editor-surface-loader--compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="atlas-editor-surface-loader__card">
        <Spinner size="medium" />
        <span>{label}</span>
      </div>
    </div>
  );
});
