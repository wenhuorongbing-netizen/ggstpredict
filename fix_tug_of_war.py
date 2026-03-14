import re

def replace_in_file(filepath, search, replace):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if search not in content:
        print("COULD NOT FIND SEARCH STRING")
    content = content.replace(search, replace)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

search_block = """                  <div className="flex justify-between items-center mb-6 mt-8 relative px-6 transform skew-x-2">"""

replace_block = """                  {/* Tug of War UI */}
                  <div className="px-6 mt-4 relative z-10 transform skew-x-2">
                     <div className="flex justify-between text-[10px] font-mono font-bold tracking-widest text-neutral-400 mb-1">
                        <div>POOL A: {match.poolA.toLocaleString()}</div>
                        <div>POOL B: {match.poolB.toLocaleString()}</div>
                     </div>
                     <div className="w-full h-3 bg-neutral-900 border border-neutral-700/50 flex overflow-hidden transform -skew-x-[10deg]">
                        <div
                          className="h-full bg-red-600 transition-all duration-500"
                          style={{ width: `${match.poolA + match.poolB === 0 ? 50 : (match.poolA / (match.poolA + match.poolB)) * 100}%`, boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}
                        ></div>
                        <div
                          className="h-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${match.poolA + match.poolB === 0 ? 50 : (match.poolB / (match.poolA + match.poolB)) * 100}%`, boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}
                        ></div>
                     </div>
                  </div>

                  {/* Players Info */}
                  <div className="flex justify-between items-center mb-6 mt-6 relative px-6 transform skew-x-2">"""

replace_in_file('app/dashboard/page.tsx', search_block, replace_block)
