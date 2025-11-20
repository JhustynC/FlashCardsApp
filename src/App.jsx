// FlashcardsApp.jsx
// Aplicación React de una sola archivo que permite cargar múltiples CSVs (sin encabezados).
// Reglas: la primera columna = pregunta, la segunda = respuesta. Al cargar cada CSV
// se agrega primero una tarjeta separadora con el nombre del archivo.

import React, { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'flashcards-app-data';

export default function App() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState(new Set());
  const [focusMode, setFocusMode] = useState(false);
  const fileInputRef = useRef(null);

  // Cargar tarjetas guardadas al iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCards(parsed);
        }
      }
    } catch (err) {
      console.error('Error cargando datos guardados:', err);
    }
  }, []);

  // Guardar tarjetas automáticamente cuando cambien
  useEffect(() => {
    if (cards.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      } catch (err) {
        console.error('Error guardando datos:', err);
      }
    } else {
      // Si no hay tarjetas, limpiar el localStorage también
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [cards]);

  // Parsea una línea CSV respetando comillas y comillas escapadas "".
  function splitCSVLine(line) {
    const res = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        res.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    res.push(cur);
    return res;
  }

  function parseCSV(text) {
    const rows = text.split(/\r?\n/).map(r => r.trim());
    const out = [];
    for (const line of rows) {
      if (!line) continue;
      const cols = splitCSVLine(line);
      // Sólo consideramos primera y segunda columna
      const q = (cols[0] || '').trim();
      const a = (cols[1] || '').trim();
      if (q || a) out.push({ question: q, answer: a });
    }
    return out;
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const parsed = parseCSV(text);
        // Agrega separador + tarjetas
        setCards(prev => [
          ...prev,
          { type: 'separator', title: file.name, id: `sep-${Date.now()}-${Math.random()}` },
          ...parsed.map((p, idx) => ({ type: 'card', question: p.question, answer: p.answer, id: `${file.name}-${idx}-${Date.now()}` }))
        ]);
      };
      reader.readAsText(file, 'UTF-8');
    });
    // Resetear el input para permitir cargar más archivos
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function loadFromUrl(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudo obtener el archivo');
      const text = await res.text();
      const parsed = parseCSV(text);
      const name = url.split('/').pop() || url;
      setCards(prev => [
        ...prev,
        { type: 'separator', title: name, id: `sep-${Date.now()}-${Math.random()}` },
        ...parsed.map((p, idx) => ({ type: 'card', question: p.question, answer: p.answer, id: `${name}-${idx}-${Date.now()}` }))
      ]);
    } catch (err) {
      alert('Error cargando desde URL: ' + err.message);
    }
  }

  function toggleFlip(id) {
    setFlipped(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  function clearAll() {
    if (!confirm('¿Limpiar todas las tarjetas? Esto eliminará también los datos guardados.')) return;
    setCards([]);
    setFlipped(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }

  function exportAllAsCSV() {
    // Exporta las tarjetas (solo las tipo card) a CSV simple
    const rows = [];
    cards.forEach(c => {
      if (c.type === 'separator') rows.push([`#${c.title}`]);
      else if (c.type === 'card') rows.push([c.question, c.answer]);
    });
    const csv = rows.map(r => r.map(field => {
      if (field == null) return '';
      const s = String(field);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function FlashcardViewer({ cards, focusMode, onExitFocus }) {
    const [index, setIndex] = React.useState(0);
    const [flip, setFlip] = React.useState(false);
    const [touchStart, setTouchStart] = React.useState(null);
    const [touchEnd, setTouchEnd] = React.useState(null);

    const current = cards[index];

    // Distancia mínima para considerar un swipe
    const minSwipeDistance = 50;

    function next() { setFlip(false); setIndex(i => Math.min(i+1, cards.length-1)); }
    function prev() { setFlip(false); setIndex(i => Math.max(i-1, 0)); }

    const onTouchStart = (e) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe && index < cards.length - 1) {
        next();
      }
      if (isRightSwipe && index > 0) {
        prev();
      }
    };

    if (!current) return null;

    if (current.type === 'separator') {
      return (
        <div className={`flex flex-col items-center gap-4 w-full px-4 ${focusMode ? 'relative' : ''}`}>
          <div 
            className="relative w-full max-w-md h-[400px] border-2 border-slate-500 rounded-lg bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 flex items-center justify-center text-white text-lg sm:text-xl font-bold text-center p-6 touch-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="absolute top-3 left-3 px-2 py-1 bg-slate-800 text-slate-200 text-xs font-bold rounded uppercase tracking-wide">
              Archivo
            </div>
            <span className="break-words overflow-auto max-h-full w-full mt-8 px-2">{current.title}</span>
          </div>
          {!focusMode && (
            <>
              {/* Indicador de swipe en móvil */}
              <div className="text-xs text-slate-400 sm:hidden">Desliza ← → para cambiar de tarjeta</div>
              <div className="flex gap-4 w-full max-w-md justify-center">
                <button onClick={prev} disabled={index===0} className="px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-1 max-w-[120px]">Anterior</button>
                <button onClick={next} disabled={index===cards.length-1} className="px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-1 max-w-[120px]">Siguiente</button>
              </div>
              <div className="text-sm text-slate-300">{index+1} / {cards.length}</div>
            </>
          )}
          {focusMode && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 items-center z-10">
              <button onClick={prev} disabled={index===0} className="px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-base">←</button>
              <span className="text-slate-300 px-4">{index+1} / {cards.length}</span>
              <button onClick={next} disabled={index===cards.length-1} className="px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-base">→</button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center gap-4 w-full px-4 ${focusMode ? 'relative' : ''}`}>
        {/* Tarjeta con tamaño fijo y soporte para swipe */}
        <div 
          className="relative w-full max-w-md h-[400px] perspective cursor-pointer touch-none"
          onClick={() => setFlip(f => !f)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className={`card-inner ${flip ? 'is-flipped' : ''}`}>
            {/* Cara frontal - PREGUNTA */}
            <div className="card-face card-front p-4 sm:p-6 border-2 border-blue-500 rounded-lg bg-gradient-to-br from-blue-900 via-blue-800 to-slate-800 flex flex-col items-center justify-center relative">
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-1 bg-blue-600 text-blue-100 text-xs font-bold rounded uppercase tracking-wide">
                Pregunta
              </div>
              <span className="font-semibold text-center text-white text-base sm:text-xl break-words overflow-auto w-full mt-8 px-2">{current.question || '(Sin pregunta)'}</span>
            </div>
            {/* Cara trasera - RESPUESTA */}
            <div className="card-face card-back p-4 sm:p-6 border-2 border-purple-500 rounded-lg bg-gradient-to-br from-purple-900 via-purple-800 to-slate-800 flex flex-col items-center justify-center relative">
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-1 bg-purple-600 text-purple-100 text-xs font-bold rounded uppercase tracking-wide">
                Respuesta
              </div>
              <span className="font-semibold text-center text-white text-base sm:text-xl break-words overflow-auto w-full mt-8 px-2">{current.answer || '(Sin respuesta)'}</span>
            </div>
          </div>
        </div>
        {!focusMode && (
          <>
            {/* Indicador de swipe en móvil */}
            <div className="text-xs text-slate-400 sm:hidden">Desliza ← → para cambiar de tarjeta</div>
            {/* Botones de navegación */}
            <div className="flex gap-4 w-full max-w-md justify-center">
              <button onClick={prev} disabled={index===0} className="px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-1 max-w-[120px]">Anterior</button>
              <button onClick={next} disabled={index===cards.length-1} className="px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-1 max-w-[120px]">Siguiente</button>
            </div>
            <div className="text-sm text-slate-300">{index+1} / {cards.length}</div>
          </>
        )}
        {focusMode && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 items-center z-10">
            <button onClick={prev} disabled={index===0} className="px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-base">←</button>
            <span className="text-slate-300 px-4">{index+1} / {cards.length}</span>
            <button onClick={next} disabled={index===cards.length-1} className="px-4 py-2 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-base">→</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-900 text-white ${focusMode ? 'fixed inset-0 overflow-hidden' : 'p-3 sm:p-6'}`}>
      <div className={`${focusMode ? 'h-full w-full flex items-center justify-center' : 'max-w-5xl mx-auto'}`}>
        {!focusMode && (
          <>
            <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Flashcards — Carga de CSVs</h1>
              <div className="flex gap-2 w-full sm:w-auto">
                {cards.length > 0 && (
                  <button 
                    className="px-3 py-1.5 rounded shadow-sm border border-slate-600 bg-slate-700 text-white hover:bg-slate-600 text-sm sm:text-base flex-1 sm:flex-none" 
                    onClick={() => setFocusMode(true)}
                  >
                    Modo Focus
                  </button>
                )}
                <button className="px-3 py-1.5 rounded shadow-sm border border-slate-600 bg-slate-700 text-white hover:bg-slate-600 text-sm sm:text-base flex-1 sm:flex-none" onClick={clearAll}>Limpiar</button>
                <button className="px-3 py-1.5 rounded shadow-sm border border-slate-600 bg-slate-700 text-white hover:bg-slate-600 text-sm sm:text-base flex-1 sm:flex-none" onClick={exportAllAsCSV}>Exportar CSV</button>
              </div>
            </header>

            <section className="mb-4 sm:mb-6 grid gap-3 md:grid-cols-2">
          <div className="p-3 sm:p-4 border border-slate-600 rounded bg-slate-800">
            <label className="block mb-2 font-medium text-white text-sm sm:text-base">Subir archivos CSV (múltiples)</label>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" multiple onChange={(e) => handleFiles(e.target.files)} className="w-full text-white file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600 text-xs sm:text-sm" />
            <p className="text-xs sm:text-sm mt-2 text-slate-300">Formato: sin encabezados. Columna 1 = pregunta, Columna 2 = respuesta.</p>
          </div>

          <div className="p-3 sm:p-4 border border-slate-600 rounded bg-slate-800">
            <label className="block mb-2 font-medium text-white text-sm sm:text-base">Cargar desde URL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="flex-1 p-1.5 sm:p-1 border border-slate-600 rounded bg-slate-700 text-white placeholder-slate-400 text-sm" placeholder="URL del CSV" id="urlInput" />
              <button className="px-3 py-1.5 sm:py-1 rounded border border-slate-600 bg-slate-700 text-white hover:bg-slate-600 text-sm sm:text-base" onClick={() => loadFromUrl(document.getElementById('urlInput').value)}>Cargar</button>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-slate-300">Si quieres cargar el CSV que ya subiste al servidor local, usa su ruta aquí.</p>
            <div className="mt-3">
              <button className="px-3 py-1.5 rounded border border-slate-600 bg-slate-700 text-white hover:bg-slate-600 text-xs sm:text-sm w-full sm:w-auto" onClick={() => loadFromUrl('/mnt/data/Tecnologias 1.csv')}>Cargar ejemplo: Tecnologias 1.csv</button>
            </div>
          </div>
        </section>
        </>
        )}

        {focusMode && (
          <button 
            className="absolute top-4 right-4 px-4 py-2 rounded shadow-lg border-2 border-slate-500 bg-slate-800 text-white hover:bg-slate-700 text-base font-semibold z-20"
            onClick={() => setFocusMode(false)}
          >
            ✕ Salir
          </button>
        )}

        <main className={focusMode ? 'w-full h-full flex items-center justify-center' : ''}>
          {cards.length === 0 && (
            <div className="p-6 text-center text-slate-300">No hay tarjetas. Sube uno o más archivos CSV para empezar.</div>
          )}

          {cards.length > 0 && (
            <FlashcardViewer 
              cards={cards} 
              focusMode={focusMode}
              onExitFocus={() => setFocusMode(false)}
            />
          )}
        </main>

        {!focusMode && (
          <footer className="mt-4 sm:mt-6 text-xs sm:text-sm text-slate-400 px-4 text-center">Haz click en una tarjeta para verla por el otro lado. Cada CSV agregado comienza con una tarjeta que muestra su nombre.</footer>
        )}
      </div>

      {/* Estilos mínimos para efecto flip */}
      <style>{`
        .perspective { perspective: 1000px; }
        .card-inner { position: relative; width: 100%; height: 400px; transform-style: preserve-3d; transition: transform 0.4s; }
        .card-inner.is-flipped { transform: rotateY(180deg); }
        .card-face { position: absolute; inset: 0; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; overflow: auto; height: 400px; }
        .card-back { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}

