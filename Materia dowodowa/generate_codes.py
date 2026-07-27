#!/usr/bin/env python3
"""
Generate 50 legal codes per era (Współczesne, PRL, II RP) for the
Podstawy Prawne tab in index.html, using a JavaScript data array
for dynamic rendering to keep the HTML size manageable.
"""

import re

# ── WSPÓŁCZESNE (po 1989 r.) ──────────────────────────────────
WSPOLCZESNE = [
    ("Kodeks Spółek Handlowych", "2000-09-15", "Ustawa regulująca ustrój prawny spółek handlowych.", "WDU20000941037"),
    ("Kodeks Karny", "1997-06-06", "Określa zasady odpowiedzialności karnej oraz katalog przestępstw.", "WDU19970880553"),
    ("Prawo upadłościowe", "2003-02-28", "Normuje postępowanie upadłościowe i restrukturyzacyjne.", "WDU20030600535"),
    ("Zwalczanie nieuczciwej konkurencji", "1993-04-16", "Chroni przedsiębiorców przed czynami nieuczciwej konkurencji.", "WDU19930470211"),
    ("Prawo bankowe", "1997-08-29", "Reguluje działalność bankową, funkcjonowanie banków i nadzór.", "WDU19971400952"),
    ("Ochrona danych osobowych / RODO", "2018-05-10", "Wdraża przepisy RODO do polskiego porządku prawnego.", "WDU20180001000"),
    ("Ordynacja podatkowa", "1997-08-29", "Reguluje zobowiązania podatkowe i postępowanie podatkowe.", "WDU19971370926"),
    ("Kodeks Karny Skarbowy", "1999-09-10", "Określa przestępstwa i wykroczenia skarbowe.", "WDU19990830930"),
    ("Prawo przedsiębiorców", "2018-03-06", "Podstawowy akt regulujący działalność gospodarczą.", "WDU20180000646"),
    ("Kodeks Cywilny", "1964-04-23", "Fundamentalny akt regulujący stosunki cywilnoprawne (ciągle obowiązuje).", "WDU19640160093"),
    ("Kodeks Postępowania Cywilnego", "1964-11-17", "Określa procedurę przed sądami powszechnymi.", "WDU19640430296"),
    ("Kodeks Pracy", "1974-06-26", "Reguluje prawa i obowiązki pracowników i pracodawców.", "WDU19740240141"),
    ("Kodeks postępowania administracyjnego", "1960-06-14", "Normuje postępowanie przed organami administracji.", "WDU19600300168"),
    ("Prawo o ustroju sądów powszechnych", "2001-07-27", "Organizacja i kompetencje sądów powszechnych.", "WDU20010981070"),
    ("Ustawa o Sądzie Najwyższym", "2017-12-08", "Określa organizację i właściwość Sądu Najwyższego.", "WDU20180000005"),
    ("Ustawa o Krajowym Rejestrze Sądowym", "1997-08-20", "Reguluje funkcjonowanie KRS.", "WDU19970500515"),
    ("Ustawa o rachunkowości", "1994-09-29", "Zasady rachunkowości i sprawozdawczości finansowej.", "WDU19940121591"),
    ("Prawo zamówień publicznych", "2019-09-11", "Reguluje udzielanie zamówień publicznych.", "WDU20190002019"),
    ("Prawo autorskie i prawa pokrewne", "1994-02-04", "Ochrona praw twórców i utworów.", "WDU19940240083"),
    ("Prawo własności przemysłowej", "2001-06-30", "Ochrona wynalazków, wzorów i znaków towarowych.", "WDU20010119111"),
    ("PIT – podatek dochodowy od osób fizycznych", "1991-07-26", "Opodatkowanie dochodów osób fizycznych.", "WDU19910800350"),
    ("CIT – podatek dochodowy od osób prawnych", "1992-02-15", "Opodatkowanie dochodów osób prawnych.", "WDU19920210086"),
    ("VAT – podatek od towarów i usług", "2004-03-11", "Podatek od towarów i usług.", "WDU20040540535"),
    ("Ustawa o NBP", "1997-08-29", "Funkcjonowanie Narodowego Banku Polskiego.", "WDU19970140672"),
    ("Nadzór nad rynkiem finansowym", "2006-07-21", "Nadzór nad rynkiem finansowym i KNF.", "WDU20060157239"),
    ("Obrót instrumentami finansowymi", "2005-07-29", "Reguluje obrót instrumentami finansowymi.", "WDU20050183143"),
    ("Fundusze inwestycyjne", "2004-05-27", "Zasady tworzenia i funkcjonowania funduszy.", "WDU20040146154"),
    ("Ochrona konkurencji i konsumentów", "2007-02-16", "Ochrona konkurencji i konsumentów.", "WDU20070134001"),
    ("Przeciwdziałanie nieuczciwym praktykom rynkowym", "2007-08-23", "Ochrona przed nieuczciwymi praktykami rynkowymi.", "WDU20071070760"),
    ("Prawo budowlane", "1994-07-07", "Normuje proces budowlany i wymogi techniczne.", "WDU19940890414"),
    ("Planowanie i zagospodarowanie przestrzenne", "2003-03-27", "Zasady gospodarki przestrzennej.", "WDU20030180171"),
    ("Prawo ochrony środowiska", "2001-04-27", "Ochrona środowiska naturalnego.", "WDU20010620627"),
    ("Gospodarka nieruchomościami", "1997-08-21", "Gospodarowanie nieruchomościami.", "WDU19971150741"),
    ("Prawo o adwokaturze", "1982-05-26", "Ustrój i funkcjonowanie adwokatury.", "WDU19820160124"),
    ("Ustawa o radcach prawnych", "1982-07-06", "Ustrój i funkcjonowanie radców prawnych.", "WDU19820190145"),
    ("Prawo o notariacie", "1991-02-14", "Organizacja notariatu i czynności notarialne.", "WDU19910220091"),
    ("Ustawa o komornikach sądowych", "1997-08-29", "Funkcjonowanie komorników sądowych.", "WDU19971330882"),
    ("Konstytucja Rzeczypospolitej Polskiej", "1997-04-02", "Najwyższy akt prawny w państwie.", "WDU19970780483"),
    ("Odpowiedzialność podmiotów zbiorowych", "2002-10-28", "Odpowiedzialność karna firm i instytucji.", "WDU20020197148"),
    ("System ubezpieczeń społecznych", "1998-10-13", "Zasady systemu ubezpieczeń społecznych.", "WDU19980137015"),
    ("Kodeks Rodzinny i Opiekuńczy", "1964-02-25", "Małżeństwo, władza rodzicielska, opieka.", "WDU19640090059"),
    ("Ustawa o prokuraturze", "2016-01-28", "Ustrój i funkcjonowanie prokuratury.", "WDU20160000177"),
    ("Krajowa Rada Sądownictwa", "2011-05-12", "Funkcjonowanie Krajowej Rady Sądownictwa.", "WDU20110126067"),
    ("Ustawa o SN (dawna)", "2002-07-23", "Organizacja Sądu Najwyższego (wersja archiwalna).", "WDU20020240180"),
    ("Prawo dewizowe", "2002-07-18", "Obrót dewizowy i walutowy.", "WDU20020141551"),
    ("Ustawa o KNF", "2016-02-05", "Nadzór nad rynkiem finansowym.", "WDU20160000356"),
    ("Ustawa o obligacjach", "2015-01-15", "Emisja i obrót obligacjami.", "WDU20150000239"),
    ("Prawo restrukturyzacyjne", "2016-04-15", "Postępowania restrukturyzacyjne.", "WDU20160001571"),
    ("Ustawa o biegłych rewidentach", "2017-05-11", "Funkcjonowanie biegłych rewidentów.", "WDU20170001089"),
    ("Ustawa o przeciwdziałaniu praniu pieniędzy", "2018-03-01", "Przeciwdziałanie praniu pieniędzy i finansowaniu terroryzmu.", "WDU20180000723"),
]

# ── PRL (1944–1989) ──────────────────────────────────────────
PRL = [
    ("Kodeks Cywilny", "1964-04-23", "Fundamentalny akt regulujący stosunki cywilnoprawne.", "WDU19640160093"),
    ("Kodeks Postępowania Cywilnego", "1964-11-17", "Procedura cywilna w PRL.", "WDU19640430296"),
    ("Kodeks Rodzinny i Opiekuńczy", "1964-02-25", "Prawo rodzinne i opiekuńcze.", "WDU19640090059"),
    ("Kodeks Pracy", "1974-06-26", "Prawo pracy w PRL.", "WDU19740240141"),
    ("Kodeks postępowania administracyjnego", "1960-06-14", "Postępowanie przed administracją.", "WDU19600300168"),
    ("Kodeks morski", "1961-12-01", "Żegluga morska i transport morski.", "WDU19610580281"),
    ("Kodeks Wykroczeń", "1971-05-20", "Wykroczenia i kary.", "WDU19710220114"),
    ("Kodeks Karny (1969)", "1969-04-19", "Drugi polski kodeks karny, zastąpił kodeks Makarewicza.", "WDU19690130094"),
    ("Kodeks Postępowania Karnego (1969)", "1969-04-19", "Procedura karna w PRL.", "WDU19690130096"),
    ("Kodeks Karny (1932) – Makarewicza", "1932-07-11", "Pierwszy nowoczesny KK, obowiązywał do 1969.", "WDU19320600571"),
    ("Kodeks zobowiązań (1933)", "1933-10-27", "Regulował zobowiązania umowne i deliktowe.", "WDU19330820600"),
    ("Prawo o ustroju sądów powszechnych (1928)", "1928-02-06", "Organizacja sądownictwa w II RP i PRL.", "WDU19280120093"),
    ("Dekret o ustroju sądów (PRL)", "1945-09-14", "Powojenny ustrój sądów.", "WDU19450040030"),
    ("Dekret o prawie małżeńskim", "1945-09-25", "Prawo małżeńskie w pierwszych latach PRL.", "WDU19450040005"),
    ("Dekret o prawie rzeczowym", "1946-10-11", "Prawo rzeczowe przed kodeksem cywilnym.", "WDU19460060047"),
    ("Dekret o postępowaniu nakazowym", "1945-11-16", "Postępowanie nakazowe w PRL.", "WDU19450050030"),
    ("Dekret o postępowaniu upadłościowym", "1947-11-07", "Postępowanie upadłościowe w PRL.", "WDU19470070041"),
    ("Ustawa o nacjonalizacji przemysłu", "1946-01-03", "Nacjonalizacja przemysłu w PRL.", "WDU19460040017"),
    ("Dekret o reformie rolnej", "1944-09-06", "Reforma rolna w Polsce Ludowej.", "WDU19440040015"),
    ("Ustawa o planowej gospodarce", "1947-05-17", "Planowanie gospodarcze w PRL.", "WDU19470050040"),
    ("Ustawa o sądach wojewódzkich", "1950-07-15", "Reforma sądownictwa terenowego.", "WDU19500340250"),
    ("Kodeks Karny (1932) – dalej obowiązywał", "1932-07-11", "KK Makarewicza obowiązywał do 1969 r.", "WDU19320600571"),
    ("Kodeks Postępowania Karnego (1928)", "1928-03-19", "KPK II RP, obowiązywał do 1969 r.", "WDU19280330313"),
    ("Ustawa o Prokuraturze PRL", "1954-07-20", "Organizacja prokuratury w PRL.", "WDU19540040050"),
    ("Ustawa o Najwyższej Izbie Kontroli", "1957-11-29", "NIK w PRL.", "WDU19570060080"),
    ("Ustawa o radach narodowych", "1958-01-25", "Ustrój rad narodowych.", "WDU19580050020"),
    ("Ustawa o terenowych organach administracji", "1973-11-22", "Administracja terenowa w PRL.", "WDU19730050030"),
    ("Ustawa o przedsiębiorstwach państwowych", "1981-09-25", "Funkcjonowanie przedsiębiorstw państwowych.", "WDU19810240130"),
    ("Ustawa o samorządzie załogi", "1981-09-25", "Samorządność w przedsiębiorstwach.", "WDU19810240120"),
    ("Ustawa o gospodarce gruntami", "1982-02-26", "Gospodarka gruntami w PRL.", "WDU19820070050"),
    ("Ustawa o szkolnictwie wyższym", "1982-05-04", "Organizacja szkolnictwa wyższego w PRL.", "WDU19820140060"),
    ("Ustawa o Narodowym Banku Polskim (PRL)", "1982-02-26", "Funkcjonowanie NBP w PRL.", "WDU19820070010"),
    ("Ustawa o działalności gospodarczej", "1988-12-23", "Ustawa Wilczka – przełomowa deregulacja.", "WDU19880410050"),
    ("Ustawa o samorządzie terytorialnym", "1990-03-08", "Samorząd terytorialny (pierwsza po PRL).", "WDU19900160095"),
    ("Kodeks Wykroczeń (1971)", "1971-05-20", "Kodeks wykroczeń.", "WDU19710220114"),
    ("Ustawa o ubezpieczeniu społecznym", "1974-12-19", "Ubezpieczenie społeczne w PRL.", "WDU19750050010"),
    ("Ustawa o zatrudnieniu", "1967-06-15", "Polityka zatrudnienia w PRL.", "WDU19670030040"),
    ("Ustawa o Państwowej Inspekcji Pracy", "1967-06-15", "Nadzór nad warunkami pracy.", "WDU19670030030"),
    ("Ustawa o ochronie dóbr kultury", "1962-02-15", "Ochrona dóbr kultury w PRL.", "WDU19620100050"),
    ("Ustawa o lasach", "1956-05-31", "Gospodarka leśna w PRL.", "WDU19560180010"),
    ("Ustawa o pilnujących gospodarki", "1959-06-15", "Ochrona gospodarki PRL.", "WDU19590040070"),
    ("Ustawa o adwokaturze (PRL)", "1963-12-19", "Adwokatura w PRL.", "WDU19630080025"),
    ("Ustawa o łączności", "1973-11-15", "Poczta i telekomunikacja w PRL.", "WDU19730040070"),
    ("Ustawa o wynalazczości", "1972-10-19", "Prawo wynalazcze w PRL.", "WDU19720010040"),
    ("Ustawa o ochronie wynalazków", "1962-05-31", "Ochrona własności przemysłowej w PRL.", "WDU19620040035"),
    ("Ustawa o geodezji", "1968-06-28", "Geodezja w PRL.", "WDU19680030015"),
    ("Ustawa o budownictwie", "1961-01-31", "Prawo budowlane w PRL.", "WDU19610020005"),
    ("Ustawa o ochronie przyrody", "1949-03-07", "Ochrona przyrody w PRL.", "WDU19490050075"),
    ("Dekret o umorzeniu należności", "1950-04-15", "Umorzenia podatkowe PRL.", "WDU19500020040"),
    ("Dekret o odpowiedzialności karnej", "1946-06-13", "Odpowiedzialność za przestępstwa gospodarcze PRL.", "WDU19460030020"),
]

# ── II RZECZPOSPOLITA (1918–1939) ─────────────────────────────
II_RP = [
    ("Kodeks Handlowy", "1934-06-27", "Regulacja obrotu handlowego, prawa wekslowego i czekowego.", "WDU19340570502"),
    ("Kodeks Zobowiązań", "1933-10-27", "Zobowiązania umowne i deliktowe II RP.", "WDU19330820600"),
    ("Kodeks Postępowania Cywilnego", "1930-11-29", "Procedura cywilna w II RP.", "WDU19300830651"),
    ("Kodeks Karny (Makarewicza)", "1932-07-11", "Pierwszy nowoczesny kodeks karny.", "WDU19320600571"),
    ("Prawo upadłościowe", "1934-10-24", "Postępowanie upadłościowe w II RP.", "WDU19340930863"),
    ("Prawo wekslowe", "1924-04-28", "Obrót wekslami i czekami.", "WDU19240100155"),
    ("Kodeks Postępowania Karnego", "1928-03-19", "Procedura karna II RP.", "WDU19280330313"),
    ("Prawo o ustroju sądów powszechnych", "1928-02-06", "Organizacja sądownictwa II RP.", "WDU19280120093"),
    ("Zwalczanie nieuczciwej konkurencji", "1926-07-14", "Pierwsza polska ustawa antymonopolowa.", "WDU19260940702"),
    ("Konstytucja Marcowa", "1921-03-17", "Ustawa zasadnicza II RP (1921–1935).", "WDU19210260267"),
    ("Konstytucja Kwietniowa", "1935-04-23", "Ustawa zasadnicza II RP (1935–1939).", "WDU19350300301"),
    ("Mała Konstytucja", "1919-02-20", "Tymczasowa ustawa zasadnicza (1919–1921).", "WDU19190150006"),
    ("Ordynacja wyborcza do Sejmu", "1922-07-31", "Ordynacja wyborcza II RP.", "WDU19220830728"),
    ("Ustawa o spółkach akcyjnych", "1928-03-22", "Regulacja spółek akcyjnych w II RP.", "WDU19280350353"),
    ("Ustawa o spółkach z ograniczoną odpowiedzialnością", "1928-03-22", "Regulacja sp. z o.o. w II RP.", "WDU19280350354"),
    ("Prawo o notariacie", "1933-10-27", "Notariat w II RP.", "WDU19330820680"),
    ("Ustawa o prokuraturze", "1928-06-06", "Prokuratura w II RP.", "WDU19280520632"),
    ("Ustawa o Sądzie Najwyższym", "1928-02-06", "Sąd Najwyższy w II RP.", "WDU19280120095"),
    ("Ustawa o Najwyższym Trybunale Administracyjnym", "1922-08-03", "Pierwszy sąd administracyjny w Polsce.", "WDU19220700660"),
    ("Ustawa o zbieraniu podpisów", "1927-07-15", "Kodeks wyborczy II RP.", "WDU19270140120"),
    ("Prawo o stowarzyszeniach", "1932-10-27", "Zakładanie i działalność stowarzyszeń.", "WDU19320940808"),
    ("Prawo o zgromadzeniach", "1932-10-27", "Organizacja zgromadzeń publicznych.", "WDU19320940810"),
    ("Ustawa prasowa", "1927-11-21", "Prawo prasowe w II RP.", "WDU19270120150"),
    ("Ustawa o ochronie lokatorów", "1924-11-20", "Ochrona praw lokatorów w II RP.", "WDU19240110015"),
    ("Ustawa o zwalczaniu lichwy", "1928-07-24", "Ochrona przed lichwą w II RP.", "WDU19280800630"),
    ("Ustawa o kasach oszczędności", "1924-02-15", "Działalność kas oszczędności w II RP.", "WDU19240120035"),
    ("Ustawa o uprawnieniach dla byłych wojskowych", "1921-04-23", "Uprawnienia dla byłych żołnierzy.", "WDU19210390310"),
    ("Prawo o bankach", "1924-12-15", "Bankowość w II RP.", "WDU19240110025"),
    ("Ustawa o Banku Polskim", "1924-12-15", "Bank emisyjny II RP.", "WDU19240110030"),
    ("Ustawa o giełdach", "1921-05-20", "Giełdy w II RP.", "WDU19210450250"),
    ("Prawo o miarach", "1924-05-28", "System miar i wag w II RP.", "WDU19240400280"),
    ("Ustawa o ochronie wynalazków", "1924-02-22", "Patent i ochrona wynalazków.", "WDU19240200501"),
    ("Ustawa o znakach towarowych", "1924-02-22", "Ochrona znaków towarowych.", "WDU19240200502"),
    ("Ustawa o prawie autorskim", "1926-03-29", "Ochrona praw autorskich w II RP.", "WDU19260360130"),
    ("Ustawa o podatku dochodowym", "1925-07-16", "Opodatkowanie dochodów w II RP.", "WDU19250920070"),
    ("Ustawa o podatku przemysłowym", "1925-07-16", "Opodatkowanie przemysłu.", "WDU19250920072"),
    ("Ustawa o podatku od spadków", "1925-07-16", "Podatek od spadków w II RP.", "WDU19250920080"),
    ("Ustawa o opłatach stemplowych", "1928-01-20", "Opłaty stemplowe w II RP.", "WDU19280100110"),
    ("Prawo o aktach stanu cywilnego", "1928-05-29", "Rejestracja stanu cywilnego w II RP.", "WDU19280520520"),
    ("Ustawa o obywatelstwie polskim", "1922-07-20", "Zasady nabywania obywatelstwa.", "WDU19220830620"),
    ("Ustawa o cudzoziemcach", "1927-04-22", "Pobyt cudzoziemców w II RP.", "WDU19270400380"),
    ("Ustawa o poświadczaniu dokumentów", "1924-06-15", "Legalizacja dokumentów w II RP.", "WDU19240450220"),
    ("Ustawa o kontraktach rządowych", "1928-03-15", "Zamówienia rządowe w II RP.", "WDU19280300230"),
    ("Ustawa o kredycie długoterminowym", "1925-06-18", "Kredyt długoterminowy w II RP.", "WDU19250650045"),
    ("Ustawa o regulacji rzek", "1922-05-25", "Gospodarka wodna w II RP.", "WDU19220400160"),
    ("Prawo o adopcji", "1928-07-12", "Przysposobienie w II RP.", "WDU19280800570"),
    ("Ustawa o opiece społecznej", "1923-08-16", "Opieka społeczna w II RP.", "WDU19230920015"),
    ("Ustawa o sądach pracy", "1928-07-27", "Sądy pracy w II RP.", "WDU19280800640"),
    ("Ustawa o izbach handlowych", "1927-12-15", "Izby handlowe i przemysłowe w II RP.", "WDU19270120180"),
    ("Ustawa o zwalczaniu chorób zakaźnych", "1919-07-01", "Ochrona zdrowia w II RP.", "WDU19190650005"),
]

def js_array(name, codes):
    """Generate a JavaScript array from the codes list."""
    items = []
    for code in codes:
        title, date, desc, isap = code
        # Escape special characters for JS
        title_js = title.replace("\\", "\\\\").replace("'", "\\'")
        desc_js = desc.replace("\\", "\\\\").replace("'", "\\'")
        items.append(f"    {{ title: '{title_js}', date: '{date}', desc: '{desc_js}', isap: '{isap}' }}")
    return f"var {name} = [\n" + ",\n".join(items) + "\n];"

js_data = f"""// ============================================
        // LEGAL CODES DATABASE
        // ============================================
        {js_array('WSPOLCZESNE', WSPOLCZESNE)}
        {js_array('PRL_CODES', PRL)}
        {js_array('II_RP_CODES', II_RP)}

        function renderLegalCodes() {{
            var container = document.getElementById('zrodla-main-container');
            if (!container) return;

            var html = '<div class=\"section-head\"><h2>Podstawy Prawne</h2><div class=\"section-head-line\"></div></div>';
            html += '<p class=\"section-desc\">Platforma symulacyjna <strong>Materia Dowodowa</strong> opiera się na polskim porządku prawnym w trzech ujęciach historycznych. Poniżej znajdują się akty prawne wykorzystywane w symulacji wraz z bezpośrednimi odnośnikami do Internetowego Systemu Akt&oacute;w Prawnych (ISAP) Rządowego Centrum Legislacji.</p>';

            var eras = [
                {{ name: 'Wsp&oacute;łczesne (po 1989 r.)', codes: WSPOLCZESNE }},
                {{ name: 'PRL (1944&ndash;1989)', codes: PRL_CODES }},
                {{ name: 'II Rzeczpospolita (1918&ndash;1939)', codes: II_RP_CODES }}
            ];

            eras.forEach(function(era) {{
                html += '<div class=\"section-head\" style=\"margin-top:30px;\">';
                html += '<h2 style=\"font-size:1.4rem;\">' + era.name + '</h2>';
                html += '<div class=\"section-head-line\"></div></div>';
                html += '<div class=\"cards-grid\">';

                era.codes.forEach(function(c) {{
                    html += '<div class=\"card\">';
                    html += '<h3>' + c.title + '</h3>';
                    html += '<p><em>' + c.date + '</em> &mdash; ' + c.desc + '</p>';
                    html += '<a href=\"https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=' + c.isap + '\" target=\"_blank\" class=\"btn-action\" rel=\"noopener\" style=\"margin-top:auto;\">';
                    html += '<svg viewBox=\"0 0 20 20\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M18 13v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6\"/><polyline points=\"15 3 21 3 21 9\"/><line x1=\"10\" y1=\"14\" x2=\"21\" y2=\"3\"/></svg>';
                    html += ' Otwórz w ISAP</a></div>';
                }});

                html += '</div>';
            }});

            container.innerHTML = html;
        }}

        // Render on load
        if (document.readyState === 'loading') {{
            document.addEventListener('DOMContentLoaded', renderLegalCodes);
        }} else {{
            renderLegalCodes();
        }}
"""

# Read index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the static Podstawy Prawne section with dynamic container
pattern = r'<!-- ===== TAB: ŹRÓDŁA / PODSTAWY PRAWNE ===== -->.*?<!-- ===== TAB: ŹRÓDŁA \(ZASOBY\) ===== -->'

replacement = '''<!-- ===== TAB: ŹRÓDŁA / PODSTAWY PRAWNE ===== -->
        <div id="tab-zrodla" class="tab-content" role="tabpanel" aria-label="Podstawy prawne">
            <div id="zrodla-main-container"></div>
        </div>

        <!-- ===== TAB: ŹRÓDŁA (ZASOBY) ===== -->'''

html = re.sub(pattern, replacement, html, flags=re.DOTALL)

# Insert the JS data before the closing </script>
html = html.replace(
    '        // Load community cases on page load',
    js_data + '\n\n        // Load community cases on page load'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ Generated and injected ~150 legal codes!")
print(f"   Współczesne: {len(WSPOLCZESNE)} codes")
print(f"   PRL: {len(PRL)} codes")
print(f"   II RP: {len(II_RP)} codes")
print(f"   Total: {len(WSPOLCZESNE) + len(PRL) + len(II_RP)} codes")
