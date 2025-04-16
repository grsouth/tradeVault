import React, { useState, useEffect } from 'react';
import TotalTrendChart from './TotalTrendChart';
import SingleTradeTrend from './SingleTradeTrend';

export default function MTGTradeTracker() {
  const [trades, setTrades] = useState(() => {
    const saved = localStorage.getItem('mtg_trades');
    if (saved) return JSON.parse(saved);

    const cards = [
      ['Lightning Bolt', 'Opt'],
      ['Counterspell', 'Brainstorm'],
      ['Serra Angel', 'Air Elemental'],
      ['Goblin Guide', 'Monastery Swiftspear'],
      ['Thoughtseize', 'Duress'],
      ['Llanowar Elves', 'Elvish Mystic'],
      ['Snapcaster Mage', 'Remand'],
      ['Path to Exile', 'Swords to Plowshares'],
      ['Dark Confidant', 'Sign in Blood'],
      ['Tarmogoyf', 'Scavenging Ooze']
    ];

    function generateHistory(base, fluctuation = 0.5, length = 6) {
      const history = [];
      let value = base + Math.random();
      for (let i = 0; i < length; i++) {
        value += (Math.random() - 0.5) * fluctuation;
        value = Math.max(0, +value.toFixed(2));
        history.push(value);
      }
      return history;
    }

    const trades = [];
    for (let i = 0; i < cards.length; i++) {
      const [giveCard, receiveCard] = cards[i];
      const monthsAgo = cards.length - i;
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);

      const giveValue = +(Math.random() * 5).toFixed(2);
      const receiveValue = +(Math.random() * 5).toFixed(2);
      const giveFallback = +(Math.random() * 3 + 2).toFixed(2);
      const receiveFallback = +(Math.random() * 5 + 1).toFixed(2);

      trades.push({
        giveCard,
        giveValue,
        receiveCard,
        receiveValue,
        date: date.toISOString(),
        giveFallback,
        receiveFallback,
        giveHistory: generateHistory(giveFallback, 1.2, 6),
        receiveHistory: generateHistory(receiveFallback, 1.4, 6)
      });
    }

    return trades;
  });

  const [prices, setPrices] = useState(() => {
    const cached = localStorage.getItem('mtg_prices');
    return cached ? JSON.parse(cached) : {};
  });

  const [showForm, setShowForm] = useState(false);
  const [expandedTrades, setExpandedTrades] = useState(() => Object.fromEntries(trades.map((_, i) => [i, true])));

  useEffect(() => {
    localStorage.setItem('mtg_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    if (Object.keys(prices).length === 0) {
      async function fetchPrices() {
        try {
          const response = await fetch('https://mtgjson.com/api/v5/AllPrices.json');
          const data = await response.json();
          const simplified = {};
          for (const fullKey in data.data) {
            const info = data.data[fullKey]?.paper?.cardmarket?.prices;
            if (info?.trendPrice) {
              const nameOnly = fullKey.toLowerCase().split(' (')[0].trim();
              if (!simplified[nameOnly]) {
                simplified[nameOnly] = info.trendPrice;
              }
            }
          }
          setPrices(simplified);
          localStorage.setItem('mtg_prices', JSON.stringify(simplified));
        } catch (err) {
          console.error("Failed to load card prices", err);
        }
      }
      fetchPrices();
    }
  }, [prices]);

  async function fetchScryfallPrice(name) {
    try {
      const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
      const data = await response.json();
      return parseFloat(data?.prices?.usd || 0);
    } catch {
      return 0;
    }
  }

  function getPrice(name) {
    if (!name) return 0;
    const key = name.toLowerCase().trim();
    return prices[key] || 0;
  }

  function toggleTradeDetails(index) {
    setExpandedTrades(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }

  async function handleAddTrade(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const giveCard = form.get("giveCard");
    const giveValue = parseFloat(form.get("giveValue")) || 0;
    const receiveCard = form.get("receiveCard");
    const receiveValue = parseFloat(form.get("receiveValue")) || 0;

    const givePrice = getPrice(giveCard);
    const receivePrice = getPrice(receiveCard);

    const fallbackGive = giveCard && givePrice === 0 ? await fetchScryfallPrice(giveCard) : 0;
    const fallbackReceive = receiveCard && receivePrice === 0 ? await fetchScryfallPrice(receiveCard) : 0;

    const newTrade = {
      giveCard,
      giveValue,
      receiveCard,
      receiveValue,
      date: new Date().toISOString(),
      giveFallback: fallbackGive,
      receiveFallback: fallbackReceive,
      giveHistory: [fallbackGive],
      receiveHistory: [fallbackReceive]
    };

    setTrades(prev => [...prev, newTrade]);
    e.target.reset();
    setShowForm(false);
  }

  function handleDelete(index) {
    setTrades(prev => prev.filter((_, i) => i !== index));
  }

  function handleEdit(index) {
    const trade = trades[index];
    const giveCard = prompt("Edit the card you're trading:", trade.giveCard || "");
    const giveValue = prompt("Edit the value you're giving:", trade.giveValue || "0");
    const receiveCard = prompt("Edit the card you're receiving:", trade.receiveCard || "");
    const receiveValue = prompt("Edit the value you're receiving:", trade.receiveValue || "0");

    if (!isNaN(parseFloat(giveValue)) && !isNaN(parseFloat(receiveValue))) {
      const updatedTrade = {
        ...trade,
        giveCard,
        giveValue: parseFloat(giveValue),
        receiveCard,
        receiveValue: parseFloat(receiveValue)
      };
      setTrades(prev => prev.map((t, i) => (i === index ? updatedTrade : t)));
    }
  }

  const totalNet = trades.reduce((sum, t) => {
    const give = t.giveValue + getPrice(t.giveCard) + (t.giveFallback || 0);
    const receive = t.receiveValue + getPrice(t.receiveCard) + (t.receiveFallback || 0);
    return sum + (receive - give);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400">MTG Trade Tracker</h1>
          <p className="text-gray-400">Track your trades like a Planeswalker manages their mana.</p>
          <p className="text-amber-300 font-semibold mt-2">
            Total Net Value: {totalNet >= 0 ? '+' : ''}${totalNet.toFixed(2)}
          </p>
        </header>

        <div className="flex justify-end gap-4 mb-4">
          <button
            onClick={() => setExpandedTrades(Object.fromEntries(trades.map((_, i) => [i, true])))}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpandedTrades(Object.fromEntries(trades.map((_, i) => [i, false])))}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
          >
            Collapse All
          </button>
        </div>

        <div className="text-right mb-4">
          <button
            onClick={() => setShowForm(prev => !prev)}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded transition"
          >
            {showForm ? 'Cancel' : '➕ Add Trade'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddTrade} className="bg-gray-800 rounded-xl p-6 space-y-4 shadow-md mb-6">
            <div className="grid grid-cols-2 gap-4">
              <input name="giveCard" placeholder="Give Card" className="p-2 bg-gray-700 rounded text-white" required />
              <input name="giveValue" type="number" step="0.01" placeholder="Give Value" className="p-2 bg-gray-700 rounded text-white" />
              <input name="receiveCard" placeholder="Receive Card" className="p-2 bg-gray-700 rounded text-white" required />
              <input name="receiveValue" type="number" step="0.01" placeholder="Receive Value" className="p-2 bg-gray-700 rounded text-white" />
            </div>
            <button className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded font-semibold">
              Submit Trade
            </button>
          </form>
        )}

        <TotalTrendChart trades={trades} />

        <section className="bg-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-semibold text-amber-300 mb-4">Your Trades</h2>
          {trades.length === 0 ? (
            <p className="text-gray-400">No trades yet.</p>
          ) : (
            trades.map((t, idx) => {
              const giveCardPrice = getPrice(t.giveCard) || t.giveFallback || 0;
              const receiveCardPrice = getPrice(t.receiveCard) || t.receiveFallback || 0;
              const net = (t.receiveValue + receiveCardPrice) - (t.giveValue + giveCardPrice);
              const oldReceived = t.receiveFallback || 0;
              const newReceived = getPrice(t.receiveCard) || 0;
              const oldGiven = t.giveFallback || 0;
              const newGiven = getPrice(t.giveCard) || 0;
              const netChange = (newReceived - oldReceived) - (newGiven - oldGiven);
              const profitClass = net > 0 ? 'text-green-400' : net < 0 ? 'text-red-400' : 'text-gray-300';
              const changeClass = netChange > 0 ? 'text-green-400' : netChange < 0 ? 'text-red-400' : 'text-gray-300';

              return (
                <div key={idx} className="my-4 bg-gray-700 text-white p-4 rounded shadow">
                  <button
                    onClick={() => toggleTradeDetails(idx)}
                    className="text-sm text-blue-300 hover:underline mb-2"
                  >
                    {expandedTrades[idx] ? '🔼 Hide Details' : '🔽 Show Details'}
                  </button>

                  {!expandedTrades[idx] && (
                    <div className="text-sm text-gray-300">
                      <p><strong>{t.giveCard || '—'}</strong> ⇄ <strong>{t.receiveCard || '—'}</strong></p>
                    </div>
                  )}

                  {expandedTrades[idx] && (
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p><strong>You gave:</strong> {t.giveCard || '—'} (${t.giveValue.toFixed(2)} + ${giveCardPrice.toFixed(2)} card)</p>
                          <p><strong>You got:</strong> {t.receiveCard || '—'} (${t.receiveValue.toFixed(2)} + ${receiveCardPrice.toFixed(2)} card)</p>
                          <p className="text-gray-400 text-sm mt-1">Date: {new Date(t.date).toLocaleDateString()}</p>
                          <p className={`mt-1 font-semibold ${profitClass}`}>Net Value: {net >= 0 ? '+' : ''}${net.toFixed(2)}</p>
                          <p className={`text-sm ${changeClass}`}>Net Change: {netChange >= 0 ? '+' : ''}${netChange.toFixed(2)}</p>
                        </div>
                        <div className="text-right space-y-2 ml-4">
                          <button onClick={() => handleEdit(idx)} className="text-sm text-amber-400 hover:underline">Edit</button><br />
                          <button onClick={() => handleDelete(idx)} className="text-sm text-red-400 hover:underline">Delete</button>
                        </div>
                      </div>
                      <SingleTradeTrend trade={t} idx={idx} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}