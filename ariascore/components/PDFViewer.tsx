import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import PdfRendererView from 'react-native-pdf-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PDFViewerProps {
  uri: string;
}

const PDFViewer = ({ uri }: PDFViewerProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const loadLastPage = async () => {
      const saved = await AsyncStorage.getItem(`pdf:lastPage:${uri}`);
      const page = saved ? Number(saved) : 1;

      if (!cancelled && Number.isFinite(page) && page > 0) {
        setCurrentPage(page);
      }
    };

    loadLastPage();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const handlePageChange = useCallback(
    async (page: number, total: number) => {
      setCurrentPage(page);
      setTotalPages(total);

      await AsyncStorage.setItem(`pdf:lastPage:${uri}`, page.toString());
    },
    [uri]
  );

  const goToPage = useCallback(
    (direction: 'next' | 'prev') => {
      console.log(
        `Tap requested ${direction}. Current page: ${currentPage} / ${totalPages}`
      );

      // This library does not appear to expose imperative setPage().
      // So for now, tap zones cannot drive page turning directly.
    },
    [currentPage, totalPages]
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <PdfRendererView
        source={uri}
        style={{ flex: 1, backgroundColor: 'black' }}
        distanceBetweenPages={0}
        maxZoom={3}
        maxPageResolution={2048}
        onPageChange={handlePageChange}
        onError={() => console.error('PDF renderer error')}
      />

      <Pressable
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '10%',
          zIndex: 999,
          elevation: 999,
          backgroundColor: 'rgba(255, 1, 1, 0.25)',
        }}
        onPress={() => goToPage('prev')}
      />

      <Pressable
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '10%',
          zIndex: 999,
          elevation: 999,
          backgroundColor: 'rgba(255, 1, 1, 0.25)',
        }}
        onPress={() => goToPage('next')}
      />
    </View>
  );
};

export default PDFViewer;