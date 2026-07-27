import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Provide the proper SVG with new viewBox and use it in Head and nav/hero
hero_logo = """<svg class="hero-logo" viewBox="400 380 380 300" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,1254) scale(0.1,-0.1)" fill="#d4af37" stroke="#d4af37" stroke-width="40" stroke-linejoin="round">
        <path d="M4612 8063 l3 -2118 1110 0 1110 0 3 28 3 27 -1085 0 -1086 0 0 2060 0 2060 983 0 983 0 1 -292 c1 -161 2 -319 2 -350 l1 -58 350 0 350 0 0 -720 c0 -396 3 -720 8 -720 4 0 18 7 30 16 l22 15 0 722 0 722 -363 363 -362 362 -1033 0 -1032 0 2 -2117z m2388 1712 l295 -295 -303 0 -302 0 0 295 c0 162 3 295 8 295 4 0 140 -133 302 -295z" />
        <path d="M7588 8283 c-52 -59 -72 -153 -43 -203 8 -14 14 -44 15 -66 0 -34 -5 -45 -25 -58 -14 -10 -31 -28 -37 -42 l-11 -24 -404 0 c-260 0 -411 -4 -424 -10 -21 -12 -25 -50 -7 -68 7 -7 22 -12 35 -12 13 0 23 -3 23 -8 0 -4 -43 -120 -96 -257 -52 -138 -130 -341 -172 -452 l-77 -203 -37 0 c-25 0 -38 -5 -38 -13 0 -22 52 -88 111 -142 183 -167 460 -178 660 -27 55 41 149 150 149 173 0 4 -19 9 -41 11 l-42 3 -163 430 c-89 237 -165 442 -169 458 l-7 27 346 0 346 0 10 -24 c4 -13 21 -33 36 -45 l27 -21 -6 -193 c-4 -105 -14 -388 -22 -627 -8 -239 -17 -486 -20 -547 l-6 -113 101 0 100 0 0 88 c0 85 -23 835 -36 1204 l-7 187 31 26 c17 14 34 35 37 45 6 19 18 20 341 20 184 0 334 -2 334 -5 0 -2 -56 -150 -124 -327 -68 -178 -145 -383 -172 -455 l-49 -133 -43 0 c-41 0 -42 -1 -31 -22 50 -97 163 -192 284 -239 50 -19 79 -23 170 -22 94 0 120 4 178 26 113 44 196 110 259 207 l29 45 -43 5 -43 5 -58 155 c-33 85 -111 289 -173 453 -63 164 -114 300 -114 302 0 3 13 5 28 5 33 0 52 16 52 45 0 45 -3 45 -425 45 l-402 0 -11 25 c-7 14 -23 30 -37 37 -21 10 -25 18 -25 57 0 26 6 55 14 66 34 50 25 116 -25 190 -28 40 -31 41 -51 18z m-753 -753 c76 -202 227 -598 240 -632 7 -17 -13 -18 -324 -18 -188 0 -331 4 -331 9 0 5 68 186 151 402 83 217 156 409 162 427 6 18 14 29 18 25 4 -5 42 -100 84 -213z m1670 45 c31 -82 94 -249 140 -370 46 -121 92 -244 104 -272 l21 -53 -335 0 -335 0 10 23 c5 12 64 166 130 342 193 510 192 508 201 494 4 -8 33 -81 64 -164z" />
        <path d="M4963 7084 c-3 -8 -1 -20 4 -25 5 -5 204 -8 504 -7 l494 3 3 23 3 22 -501 0 c-445 0 -501 -2 -507 -16z" />
        <path d="M4967 6803 c-15 -15 -6 -43 16 -48 12 -3 238 -4 502 -3 l480 3 0 25 0 25 -496 3 c-272 1 -499 -1 -502 -5z" />
        <path d="M4964 6495 c-3 -8 -3 -19 1 -25 4 -7 211 -10 646 -10 l639 0 0 25 0 25 -640 0 c-551 0 -641 -2 -646 -15z" />
        <path d="M7401 6179 c-13 -5 -30 -17 -37 -27 -32 -41 -25 -42 236 -42 170 0 250 3 250 11 0 23 -21 47 -51 58 -39 14 -364 14 -398 0z" />
        <path d="M7041 6063 c-32 -27 -38 -76 -12 -102 21 -21 25 -21 564 -21 475 0 545 2 565 16 30 21 29 68 -3 99 l-24 25 -534 0 c-495 0 -536 -1 -556 -17z" />
    </g>
</svg>"""

nav_logo = hero_logo.replace('class="hero-logo"', 'class="nav-logo"')
favicon_str = "data:image/svg+xml;utf8," + hero_logo.replace('"', "'").replace('#', '%23').replace('\n', ' ')

# Update favicon
text = re.sub(r'<link rel="icon" type="image/svg\+xml"\s*href=".*?"', f'<link rel="icon" type="image/svg+xml" href="{favicon_str}"', text, flags=re.DOTALL)

# Update nav-logo
text = re.sub(r'<svg class="nav-logo".*?</svg>', nav_logo, text, flags=re.DOTALL)

# Update hero-logo and remove the unwanted title span and desc
text = re.sub(r'<svg class="hero-logo".*?</svg>\s*<h1 class="hero-title">Materia Dowodowa</h1>\s*<p class="hero-sub">Symulacja prawno-gospodarcza &mdash; analiza, strategia, orzecznictwo</p>', f'{hero_logo}\n<h1 class="hero-title" style="margin-top:20px; font-size:3rem; font-weight:800; letter-spacing:4px;">Materia Dowodowa</h1>', text, flags=re.DOTALL)

# remove hero-title::after line
text = re.sub(r'\.hero-title::after\s*{[^}]*}', '', text, flags=re.DOTALL)

# Fonts update
text = re.sub(r"@import url.*?Playfair\+Display.*?;\n?", "", text, flags=re.DOTALL)
text = re.sub(r"font-family:\s*'Playfair Display', serif;", "font-family: 'Open Sans', 'Montserrat', sans-serif;", text)

# CSS for nav wrap
css_patch = """
        .nav-inner {
            flex-wrap: wrap; 
            justify-content: center;
        }
        .nav-scroll {
            flex-wrap: wrap; justify-content: center; overflow: visible; height: auto; mask-image: none;
            padding-right: 0; display: flex; 
        }
        .top-nav { height: auto; min-height: 80px; padding: 10px 0; }
        .card { display: flex; flex-direction: column; }
        .card .btn-action { margin-top: auto; }
        .nav-item svg { stroke: var(--accent); fill: none; }
        /* Add hover text gold */
        .nav-item:hover, .nav-item:focus-visible { color: var(--accent) !important; }
"""
text = text.replace('/* RWD */', css_patch + '/* RWD */')

# JS for PDF
js_patch = """
            // Add BLOB
            let fileUrl = '#';
            let btnText = 'ZOBACZ ORZECZENIE';
            if (fileInput.files.length > 0) {
                fileUrl = URL.createObjectURL(fileInput.files[0]);
                btnText = 'Otwórz wysłany wyrok (' + fileName + ')';
            }
            card.innerHTML = `<h3>${title}</h3><p><strong>Organ orzekający:</strong> ${court}</p><p>${desc}</p><a href="${fileUrl}" target="_blank" class="btn-action" style="margin-top: 15px;">${btnText}</a>`;
"""
text = re.sub(r"card.innerHTML = `<h3>\$\{title\}.*?<small.*?</small></p>`;", js_patch, text, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

