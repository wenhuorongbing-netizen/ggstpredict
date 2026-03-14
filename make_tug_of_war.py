import re

def replace_in_file(filepath, search, replace):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if search not in content:
        print(f"Warning: Could not find search block in {filepath}")
    content = content.replace(search, replace)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

search_block = """                        <div className="flex justify-between text-xs font-mono font-bold tracking-widest text-neutral-500 mb-2">
                          <div>
                            POOL A: {match.poolA.toLocaleString()}
                            <br/>
                            <span className="text-red-400">PAYS {(match.poolB === 0 || match.poolA === 0) ? '1.00' : (1 + match.poolB / match.poolA).toFixed(2)}x</span>
                          </div>
                          <div className="text-right">
                            POOL B: {match.poolB.toLocaleString()}
                            <br/>
                            <span className="text-blue-400">PAYS {(match.poolA === 0 || match.poolB === 0) ? '1.00' : (1 + match.poolA / match.poolB).toFixed(2)}x</span>
                          </div>
                        </div>"""

replace_block = """                        <div className="mb-4">
                          <div className="flex justify-between text-xs font-mono font-bold tracking-widest text-neutral-500 mb-1">
                            <div>POOL A: {match.poolA.toLocaleString()}</div>
                            <div>POOL B: {match.poolB.toLocaleString()}</div>
                          </div>
                          {/* Tug of War Health Bar */}
                          <div className="w-full h-3 bg-neutral-900 border border-neutral-700/50 flex overflow-hidden transform skew-x-[-10deg]">
                            <div
                              className="h-full bg-red-600 transition-all duration-500"
                              style={{ width: `${match.poolA + match.poolB === 0 ? 50 : (match.poolA / (match.poolA + match.poolB)) * 100}%`, boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}
                            ></div>
                            <div
                              className="h-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${match.poolA + match.poolB === 0 ? 50 : (match.poolB / (match.poolA + match.poolB)) * 100}%`, boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}
                            ></div>
                          </div>
                        </div>"""

replace_in_file('app/dashboard/page.tsx', search_block, replace_block)
