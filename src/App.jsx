// FlashcardsApp.jsx
// Aplicación React de una sola archivo que permite cargar múltiples CSVs (sin encabezados).
// Reglas: la primera columna = pregunta, la segunda = respuesta. Al cargar cada CSV
// se agrega primero una tarjeta separadora con el nombre del archivo.

import React, { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'flashcards-app-data';

export default function App() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState(new Set());
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

  function FlashcardViewer({ cards }) {
    const [index, setIndex] = React.useState(0);
    const [flip, setFlip] = React.useState(false);

    const current = cards[index];

    function next() { setFlip(false); setIndex(i => Math.min(i+1, cards.length-1)); }
    function prev() { setFlip(false); setIndex(i => Math.max(i-1, 0)); }

    if (!current) return null;

    if (current.type === 'separator') {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="p-6 border border-slate-600 rounded bg-slate-700 text-white text-xl font-bold">{current.title}</div>
          <div className="flex gap-4">
            <button onClick={prev} disabled={index===0} className="px-3 py-1 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
            <button onClick={next} disabled={index===cards.length-1} className="px-3 py-1 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
          </div>
          <div className="text-sm text-slate-300">{index+1} / {cards.length}</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-96 min-h-[300px] perspective cursor-pointer" onClick={() => setFlip(f => !f)}>
          <div className={`card-inner ${flip ? 'is-flipped' : ''}`}>
            <div className="card-face card-front p-6 border border-slate-600 rounded bg-slate-800 flex items-center justify-center">
              <span className="font-medium text-center text-white text-lg break-words overflow-auto max-h-full w-full">{current.question || '(Sin pregunta)'}</span>
            </div>
            <div className="card-face card-back p-6 border border-slate-600 rounded bg-slate-800 flex items-center justify-center">
              <span className="font-medium text-center text-white text-lg break-words overflow-auto max-h-full w-full">{current.answer || '(Sin respuesta)'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={prev} disabled={index===0} className="px-3 py-1 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
          <button onClick={next} disabled={index===cards.length-1} className="px-3 py-1 border border-slate-600 rounded bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
        </div>
        <div className="text-sm text-slate-300">{index+1} / {cards.length}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Flashcards — Carga de CSVs</h1>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded shadow-sm border border-slate-600 bg-slate-700 text-white hover:bg-slate-600" onClick={clearAll}>Limpiar</button>
            <button className="px-3 py-1 rounded shadow-sm border border-slate-600 bg-slate-700 text-white hover:bg-slate-600" onClick={exportAllAsCSV}>Exportar CSV</button>
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-2">
          <div className="p-4 border border-slate-600 rounded bg-slate-800">
            <label className="block mb-2 font-medium text-white">Subir archivos CSV (múltiples)</label>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" multiple onChange={(e) => handleFiles(e.target.files)} className="text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600" />
            <p className="text-sm mt-2 text-slate-300">Formato: sin encabezados. Columna 1 = pregunta, Columna 2 = respuesta.</p>
          </div>

          <div className="p-4 border border-slate-600 rounded bg-slate-800">
            <label className="block mb-2 font-medium text-white">Cargar desde URL (ejemplo)</label>
            <div className="flex gap-2">
              <input className="flex-1 p-1 border border-slate-600 rounded bg-slate-700 text-white placeholder-slate-400" placeholder="URL del CSV" id="urlInput" />
              <button className="px-3 py-1 rounded border border-slate-600 bg-slate-700 text-white hover:bg-slate-600" onClick={() => loadFromUrl(document.getElementById('urlInput').value)}>Cargar</button>
            </div>
            <p className="mt-2 text-sm text-slate-300">Si quieres cargar el CSV que ya subiste al servidor local, usa su ruta aquí.</p>
            <div className="mt-3">
              <button className="px-3 py-1 rounded border border-slate-600 bg-slate-700 text-white hover:bg-slate-600" onClick={() => loadFromUrl('/mnt/data/Tecnologias 1.csv')}>Cargar ejemplo: Tecnologias 1.csv</button>
            </div>
          </div>
        </section>

        <main>
          {cards.length === 0 && (
            <div className="p-6 text-center text-slate-300">No hay tarjetas. Sube uno o más archivos CSV para empezar.</div>
          )}

          {cards.length > 0 && (
            <FlashcardViewer cards={cards} />
          )}
        </main>

        <footer className="mt-6 text-sm text-slate-400">Haz click en una tarjeta para verla por el otro lado. Cada CSV agregado comienza con una tarjeta que muestra su nombre.</footer>
      </div>

      {/* Estilos mínimos para efecto flip */}
      <style>{`
        .perspective { perspective: 1000px; }
        .card-inner { position: relative; width: 100%; height: 100%; min-height: 300px; transform-style: preserve-3d; transition: transform 0.4s; }
        .card-inner.is-flipped { transform: rotateY(180deg); }
        .card-face { position: absolute; inset: 0; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; overflow: auto; }
        .card-back { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}

