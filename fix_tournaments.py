import re

def main():
    with open('app/admin/page.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # The API /api/tournaments returns an object { tournament: ... } or { tournament: null }
    # So `setTournaments(data)` is setting it to an object, not an array.
    # The previous code assumed it returned an array of tournaments. Let's fix fetchTournaments.

    search_block = """  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
        if (data.length > 0) {
          setTournamentId(data[0].id);
        }
      }
    } catch (err) {}
  };"""

    replace_block = """  const fetchTournaments = async () => {
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) {
        const data = await res.json();
        if (data.tournament) {
          setTournaments([data.tournament]);
          setTournamentId(data.tournament.id);
        } else {
          setTournaments([]);
        }
      }
    } catch (err) {}
  };"""

    content = content.replace(search_block, replace_block)

    with open('app/admin/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
