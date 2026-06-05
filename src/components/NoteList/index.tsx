import { useEffect, useRef, useState } from 'react';
import { NoteContainerWithShader } from './NoteContainerWithShader';

type ChartNoteTabProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const NoteList = ({ children, style }: ChartNoteTabProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [topGradientHeight, setTopGradientHeight] = useState(0);
  const [bottomnGradientHeight, setBottomGradientHeight] = useState(20);

  const checkScrollBottom = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const bottomPadding = 20; // Distance from the bottom to start transition
    const gradientMaxHeight = 20; // Max height of the gradient

    if (scrollTop + clientHeight >= scrollHeight - bottomPadding) {
      const overflow =
        scrollTop + clientHeight - (scrollHeight - bottomPadding);
      const visibleHeight = Math.max(gradientMaxHeight - overflow, 0);
      setBottomGradientHeight(visibleHeight);
    } else {
      setBottomGradientHeight(gradientMaxHeight);
    }

    const topGradientVisibility =
      scrollTop > gradientMaxHeight ? gradientMaxHeight : scrollTop;
    setTopGradientHeight(topGradientVisibility);
  };

  useEffect(() => {
    const panel = scrollRef.current;
    if (panel) {
      panel.addEventListener('scroll', checkScrollBottom);
      // Run once initially to set correct gradient values
      checkScrollBottom();
      return () => panel.removeEventListener('scroll', checkScrollBottom);
    }
  }, [children]);

  return (
    <NoteContainerWithShader
      ref={scrollRef}
      id="NotesTabPanel"
      topGradientHeight={topGradientHeight}
      bottomGradientHeight={bottomnGradientHeight}
      style={style}
    >
      {children}
    </NoteContainerWithShader>
  );
};
