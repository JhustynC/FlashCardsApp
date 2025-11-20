// FlashcardsApp.jsx
// Aplicación React de una sola archivo que permite cargar múltiples CSVs (sin encabezados).
// Reglas: la primera columna = pregunta, la segunda = respuesta. Al cargar cada CSV
// se agrega primero una tarjeta separadora con el nombre del archivo.

import React, { useState } from 'react';

export default function App() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState(new Set());

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
    if (!confirm('¿Limpiar todas las tarjetas?')) return;
    setCards([]);
    setFlipped(new Set());
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
          <div className="p-6 border rounded bg-slate-100 text-xl font-bold">{current.title}</div>
          <div className="flex gap-4">
            <button onClick={prev} disabled={index===0} className="px-3 py-1 border rounded">Anterior</button>
            <button onClick={next} disabled={index===cards.length-1} className="px-3 py-1 border rounded">Siguiente</button>
          </div>
          <div className="text-sm text-slate-500">{index+1} / {cards.length}</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-80 h-48 perspective" onClick={() => setFlip(f => !f)}>
          <div className={`card-inner ${flip ? 'is-flipped' : ''}`}>
            <div className="card-face card-front p-4 border rounded bg-white flex items-center justify-center">
              <span className="font-medium text-center">{current.question}</span>
            </div>
            <div className="card-face card-back p-4 border rounded bg-white flex items-center justify-center">
              <span className="font-medium text-center">{current.answer}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={prev} disabled={index===0} className="px-3 py-1 border rounded">Anterior</button>
          <button onClick={next} disabled={index===cards.length-1} className="px-3 py-1 border rounded">Siguiente</button>
        </div>
        <div className="text-sm text-slate-500">{index+1} / {cards.length}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Flashcards — Carga de CSVs</h1>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded shadow-sm border" onClick={clearAll}>Limpiar</button>
            <button className="px-3 py-1 rounded shadow-sm border" onClick={exportAllAsCSV}>Exportar CSV</button>
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-2">
          <div className="p-4 border rounded bg-white">
            <label className="block mb-2 font-medium">Subir archivos CSV (múltiples)</label>
            <input type="file" accept=".csv,text/csv" multiple onChange={(e) => handleFiles(e.target.files)} />
            <p className="text-sm mt-2 text-slate-500">Formato: sin encabezados. Columna 1 = pregunta, Columna 2 = respuesta.</p>
          </div>

          <div className="p-4 border rounded bg-white">
            <label className="block mb-2 font-medium">Cargar desde URL (ejemplo)</label>
            <div className="flex gap-2">
              <input className="flex-1 p-1 border rounded" placeholder="URL del CSV" id="urlInput" />
              <button className="px-3 py-1 rounded border" onClick={() => loadFromUrl(document.getElementById('urlInput').value)}>Cargar</button>
            </div>
            <p className="mt-2 text-sm text-slate-500">Si quieres cargar el CSV que ya subiste al servidor local, usa su ruta aquí.</p>
            <div className="mt-3">
              <button className="px-3 py-1 rounded border" onClick={() => loadFromUrl('/mnt/data/Tecnologias 1.csv')}>Cargar ejemplo: Tecnologias 1.csv</button>
            </div>
          </div>
        </section>

        <main>
          {cards.length === 0 && (
            <div className="p-6 text-center text-slate-500">No hay tarjetas. Sube uno o más archivos CSV para empezar.</div>
          )}

          {cards.length > 0 && (
            <FlashcardViewer cards={cards} />
          )}
        </main>

        <footer className="mt-6 text-sm text-slate-500">Haz click en una tarjeta para verla por el otro lado. Cada CSV agregado comienza con una tarjeta que muestra su nombre.</footer>
      </div>

      {/* Estilos mínimos para efecto flip */}
      <style>{`
        .perspective { perspective: 1000px; }
        .card-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.4s; }
        .card-inner.is-flipped { transform: rotateY(180deg); }
        .card-face { position: absolute; inset: 0; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; }
        .card-back { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
