import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('prices');
  const [searchItem, setSearchItem] = useState('');
  const [selectedServer, setSelectedServer] = useState('all');
  const [searchResults, setSearchResults] = useState([]);

  // Anniversary realm servers
  const servers = {
    'dreamscythe': 'Dreamscythe (Normal)',
    'nightslayer': 'Nightslayer (PvP)', 
    'doomhowl': 'Doomhowl (Hardcore)',
    'thunderstrike': 'Thunderstrike (EU Normal)',
    'spineshatter': 'Spineshatter (EU PvP)',
    'soulseeker': 'Soulseeker (EU Hardcore)',
    'maladath': 'Maladath (Oceanic)'
  };

  // Sample item data (will be replaced with real API later)
  const sampleItems = {
    'Greater Fire Protection Potion': {
      quality: 'uncommon',
      icon: 'inv_potion_24',
      prices: {
        dreamscythe: { alliance: 8, horde: 7 },
        nightslayer: { alliance: 12, horde: 11 },
        doomhowl: { alliance: 9, horde: 8 }
      }
    },
    'Mooncloth Bag': {
      quality: 'rare', 
      icon: 'inv_misc_bag_10',
      prices: {
        dreamscythe: { alliance: 45, horde: 48 },
        nightslayer: { alliance: 52, horde: 55 },
        doomhowl: { alliance: 42, horde: 44 }
      }
    },
    'Black Lotus': {
      quality: 'epic',
      icon: 'inv_misc_herb_blacklotus', 
      prices: {
        dreamscythe: { alliance: 185, horde: 180 },
        nightslayer: { alliance: 195, horde: 192 },
        doomhowl: { alliance: 178, horde: 175 }
      }
    },
    'Elixir of the Mongoose': {
      quality: 'uncommon',
      icon: 'inv_potion_32',
      prices: {
        dreamscythe: { alliance: 15, horde: 14 },
        nightslayer: { alliance: 18, horde: 17 },
        doomhowl: { alliance: 16, horde: 15 }
      }
    },
    'Arcanite Bar': {
      quality: 'uncommon',
      icon: 'inv_ingot_08',
      prices: {
        dreamscythe: { alliance: 23, horde: 25 },
        nightslayer: { alliance: 28, horde: 27 },
        doomhowl: { alliance: 26, horde: 24 }
      }
    }
  };

  const searchItems = () => {
    if (!searchItem.trim()) return;
    
    const results = Object.keys(sampleItems).filter(item =>
      item.toLowerCase().includes(searchItem.toLowerCase())
    );
    
    setSearchResults(results);
  };

  const quickSearch = (itemName) => {
    setSearchItem(itemName);
    setSearchResults([itemName]);
  };

  return (
    <>
      <Head>
        <title>Anniversary AH - WoW Anniversary Realm AH Tracker</title>
        <meta name="description" content="Track WoW Classic Anniversary realm auction house prices and calculate crafting profits" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Floating gold coins animation */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute animate-bounce" style={{left: '10%', animationDelay: '0s', animationDuration: '6s'}}>
            <div className="w-5 h-5 bg-yellow-400 rounded-full opacity-20"></div>
          </div>
          <div className="absolute animate-bounce" style={{left: '50%', animationDelay: '2s', animationDuration: '8s'}}>
            <div className="w-4 h-4 bg-yellow-400 rounded-full opacity-20"></div>
          </div>
          <div className="absolute animate-bounce" style={{left: '80%', animationDelay: '4s', animationDuration: '7s'}}>
            <div className="w-6 h-6 bg-yellow-400 rounded-full opacity-20"></div>
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-cyan-400 bg-clip-text text-transparent">
              ⚔️ Anniversary AH
            </h1>
            <p className="text-xl text-gray-300 mb-2">WoW Anniversary Realms - Auction House & Crafting Calculator</p>
            <p className="text-lg text-gray-400 italic mb-4">Created by goblins for goblins</p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
              <span className="text-yellow-400 font-bold">🆕 Anniversary Realms</span>
              <span className="text-cyan-400 mx-4">Currently: Classic</span>
              <span className="text-orange-400">Coming: TBC (Winter/Spring 2025-26)</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 bg-white/10 p-2 rounded-2xl backdrop-blur-md">
            {[
              { id: 'prices', label: '📊 Price Tracker', desc: 'Track prices across all Anniversary realms' },
              { id: 'crafting', label: '⚒️ Crafting Calculator', desc: 'Coming Soon!' },
              { id: 'watchlist', label: '⭐ Watchlist', desc: 'Track your favorite items' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex-1 p-4 rounded-xl font-semibold transition-all duration-300 ${
                  currentTab === tab.id
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="text-lg">{tab.label}</div>
                <div className="text-sm opacity-75">{tab.desc}</div>
              </button>
            ))}
          </div>

          {/* Price Tracker Tab */}
          {currentTab === 'prices' && (
            <div className="space-y-6">
              {/* Search Section */}
              <div className="bg-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-md">
                <h3 className="text-yellow-400 text-xl font-bold mb-4">🏰 Server & Item Search</h3>
                
                {/* Quick Items */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-gray-400 mr-4">Anniversary Essentials:</span>
                  {['Greater Fire Protection Potion', 'Mooncloth Bag', 'Black Lotus', 'Elixir of the Mongoose', 'Arcanite Bar'].map((item) => (
                    <button
                      key={item}
                      onClick={() => quickSearch(item)}
                      className="px-3 py-1 bg-yellow-400/20 text-yellow-400 border border-yellow-400 rounded-full text-sm hover:bg-yellow-400 hover:text-slate-900 transition-all"
                    >
                      {item.replace(' Protection', '').replace(' Potion', '').replace(' of the', '')}
                    </button>
                  ))}
                </div>

                {/* Search Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-yellow-400 font-semibold mb-2">Item Name</label>
                    <input
                      type="text"
                      value={searchItem}
                      onChange={(e) => setSearchItem(e.target.value)}
                      placeholder="e.g., Black Lotus"
                      className="w-full p-3 border border-white/20 rounded-lg bg-black/30 text-gray-200 focus:border-yellow-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-yellow-400 font-semibold mb-2">Anniversary Realm</label>
                    <select
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(e.target.value)}
                      className="w-full p-3 border border-white/20 rounded-lg bg-black/30 text-gray-200 focus:border-yellow-400 focus:outline-none"
                    >
                      <option value="all">All Anniversary Realms</option>
                      {Object.entries(servers).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={searchItems}
                      className="w-full p-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 font-bold rounded-lg hover:shadow-lg hover:shadow-yellow-400/25 transition-all"
                    >
                      Search Prices
                    </button>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div className="bg-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-md">
                <h3 className="text-yellow-400 text-xl font-bold mb-4">📊 Price Results</h3>
                
                {searchResults.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <h4 className="text-lg mb-2">🔍 Search for items to see Anniversary realm prices</h4>
                    <p>Try clicking the quick search buttons above!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchResults.map((itemName) => {
                      const item = sampleItems[itemName];
                      return (
                        <div key={itemName} className="bg-black/30 border border-white/10 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h4 className="text-yellow-400 text-lg font-bold">{itemName}</h4>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                item.quality === 'epic' ? 'bg-purple-600' :
                                item.quality === 'rare' ? 'bg-blue-600' : 'bg-green-600'
                              }`}>
                                {item.quality}
                              </span>
                            </div>
                            <button className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 font-bold rounded-lg text-sm">
                              Add to Watchlist
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(item.prices).map(([server, prices]) => (
                              <div key={server} className="bg-black/20 p-3 rounded-lg text-center">
                                <div className="text-cyan-400 font-bold mb-1">{servers[server]}</div>
                                <div className="text-yellow-400 font-bold text-lg">
                                  A: {prices.alliance}g | H: {prices.horde}g
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Crafting Calculator Tab - Coming Soon */}
          {currentTab === 'crafting' && (
            <div className="bg-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-yellow-400 text-xl font-bold mb-4">⚒️ Crafting Profit Calculator</h3>
              
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚧</div>
                <h4 className="text-2xl text-yellow-400 font-bold mb-2">Coming Soon!</h4>
                <p className="text-gray-300 mb-4">We're building the ultimate crafting profit calculator for Anniversary realms!</p>
                <p className="text-gray-400 mb-4">Features will include:</p>
                <ul className="text-gray-400 mt-2 space-y-1 max-w-md mx-auto text-left">
                  <li>• Real-time profit calculations</li>
                  <li>• Cross-realm arbitrage opportunities</li>
                  <li>• Classic recipe database</li>
                  <li>• TBC preparation tools</li>
                  <li>• Guild shopping lists</li>
                  <li>• Price alerts & notifications</li>
                </ul>
                <div className="mt-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                  <p className="text-yellow-400 font-bold">Built by goblins for goblins!</p>
                </div>
              </div>
            </div>
          )}

          {/* Watchlist Tab */}
          {currentTab === 'watchlist' && (
            <div className="bg-white/5 border border-white/20 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-yellow-400 text-xl font-bold mb-4">⭐ Your Watchlist</h3>
              <div className="text-center py-12 text-gray-400">
                <h4 className="text-lg mb-2">Add items to your watchlist to track prices and get alerts!</h4>
                <p>Items you add from the Price Tracker will appear here.</p>
                <button 
                  onClick={() => setCurrentTab('prices')}
                  className="mt-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 px-6 py-3 rounded-lg font-bold hover:shadow-lg transition-all"
                >
                  Start Tracking Items
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
