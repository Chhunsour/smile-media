import { sleep } from '@/demo/persist';

import type { AIProvider, Lang, Tone } from '../types';

/*
 * Mock writing assistant. Same async signatures a real model call would have,
 * so swapping in an edge function that calls an LLM touches only this file.
 */

const think = () => sleep(650 + Math.random() * 650);
const clean = (t: string) =>
  t
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
const sentences = (t: string) => (t.match(/[^.!?…]+[.!?…]*\s*/g) ?? []).map((s) => s.trim()).filter(Boolean);
const unique = <T>(xs: T[]) => [...new Set(xs)];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]️?/gu;

const OPENERS = {
  friendly: ['Big news, film fans — ', 'Hey movie lovers! ', 'Okay, film fans: '],
  professional: ['', 'We’re pleased to share: ', 'Announcement: '],
  playful: ['Plot twist: ', 'Not to be dramatic, but ', 'PSA: '],
  bold: ['This is it. ', 'Lights, camera… ', 'Stop scrolling. '],
};
const CLOSERS = {
  friendly: ['See you at the movies 🍿', 'Tell us what you think below.', 'Tag someone you’d watch this with.'],
  professional: ['Learn more at the link in our bio.', 'Details at the link in our bio.', 'Questions? Reply and we’ll help.'],
  playful: ['Who’s in? 👀', 'Tag your movie buddy 🍿', 'Hit play. You know you want to 😉'],
  bold: ['Don’t miss it.', 'Be there.', 'Roll camera.'],
};
const FLAIR: [RegExp, string][] = [
  [/film|movie|trailer|cinema|premiere/i, '🎬'],
  [/music|soundtrack|album|song/i, '🎧'],
  [/live|stream/i, '🔴'],
  [/new|launch|drop|out now/i, '✨'],
  [/camera|shoot|behind/i, '🎥'],
  [/popcorn|movie night/i, '🍿'],
  [/hiring|casting|team/i, '🙌'],
];
// Words safe to lowercase when an opener runs into the sentence ("PSA: our trailer…").
const LOWERABLE = new Set([
  'our',
  'the',
  'we',
  'we’re',
  'this',
  'it',
  'new',
  'official',
  'open',
  'behind',
  'which',
  'premiere',
  'friday',
  'a',
  'an',
]);

async function improve(text: string, tone: Tone, attempt = 0): Promise<string> {
  await think();
  const base = clean(text).replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
  if (tone === 'shorter') return fit(base, Math.max(60, Math.round(base.length * 0.55)));

  const plain = tone === 'professional' ? base.replace(EMOJI, '').replace(/!+/g, '.').replace(/ {2,}/g, ' ').trim() : base;
  const opener = OPENERS[tone][attempt % 3];
  const runOn = opener && !/[.!?]\s$/.test(opener) && LOWERABLE.has(plain.split(/\s/)[0].toLowerCase());
  const body = runOn ? plain[0].toLowerCase() + plain.slice(1) : plain;
  const flair =
    tone === 'playful'
      ? FLAIR.filter(([re, e]) => re.test(text) && !text.includes(e))
          .map(([, e]) => e)
          .slice(0, 2)
          .join('')
      : '';
  return `${opener}${body}${flair ? ` ${flair}` : ''}\n\n${CLOSERS[tone][attempt % 3]}`;
}

const DICT: Record<Lang, string> = {
  es: 'official trailer=tráiler oficial|link in bio=enlace en la bio|film=película|movie=película|trailer=tráiler|watch=mira|tonight=esta noche|live=en vivo|music=música|soundtrack=banda sonora|cast=elenco|questions=preguntas|premiere=estreno|night=noche|everyone=todos|cinemas=cines|full=completo|favorite=favorito|shot=plano|behind the scenes=detrás de cámaras|link in bio=enlace en la bio|this weekend=este fin de semana|is here=ya está aquí|is back=ha vuelto|see you soon=nos vemos pronto|thank you=gracias|good morning=buenos días|the=el|a=un|our=nuestro|new=nuevo|is=es|are=son|here=aquí|this=este|today=hoy|tomorrow=mañana|week=semana|weekend=fin de semana|coffee=café|free=gratis|with=con|every=cada|and=y|for=para|you=tú|we=nosotros|your=tu|menu=menú|now=ahora|open=abierto|come=ven|join=únete|best=mejor|morning=mañana|mornings=mañanas|fresh=fresco|good=buen|more=más|in=en|at=en|on=en|to=a|of=de|from=de|day=día|thanks=gracias|friends=amigos|friend=amigo|happy=feliz|slow=lentas|saturday=sábado|sunday=domingo|autumn=otoño|winter=invierno|blend=mezcla|names=nombres|help=ayuda|decide=decidir|hiring=contratando|roast=tueste|year=año|first=primer|update=novedad|hours=horario|video=vídeo|pastry=bollo|new single origin=nuevo origen único',
  fr: 'official trailer=bande-annonce officielle|film=film|movie=film|trailer=bande-annonce|watch=regardez|tonight=ce soir|live=en direct|music=musique|soundtrack=bande originale|cast=casting|questions=questions|premiere=avant-première|night=soirée|everyone=tout le monde|cinemas=salles|full=complète|favorite=préféré|shot=plan|behind the scenes=coulisses|link in bio=lien en bio|this weekend=ce week-end|is here=est arrivé|is back=est de retour|see you soon=à bientôt|thank you=merci|good morning=bonjour|the=le|a=un|our=notre|new=nouveau|is=est|are=sont|here=ici|this=ce|today=aujourd’hui|tomorrow=demain|week=semaine|weekend=week-end|coffee=café|free=gratuit|with=avec|every=chaque|and=et|for=pour|you=vous|we=nous|your=votre|menu=menu|now=maintenant|open=ouvert|come=venez|join=rejoignez|best=meilleur|morning=matin|mornings=matins|fresh=frais|good=bon|more=plus|in=dans|at=à|on=sur|to=à|of=de|from=de|day=jour|thanks=merci|friends=amis|friend=ami|happy=joyeux|slow=lents|saturday=samedi|sunday=dimanche|autumn=automne|winter=hiver|blend=mélange|names=noms|help=aidez|decide=décider|hiring=recrute|roast=torréfaction|year=an|first=premier|update=nouvelle|hours=horaires|video=vidéo|pastry=viennoiserie',
  de: 'official trailer=offizieller Trailer|film=Film|movie=Film|trailer=Trailer|watch=schaut|tonight=heute Abend|live=live|music=Musik|soundtrack=Soundtrack|cast=Besetzung|questions=Fragen|premiere=Premiere|night=Abend|everyone=alle|cinemas=Kinos|full=ganzen|favorite=Lieblings|shot=Einstellung|behind the scenes=hinter den Kulissen|link in bio=Link in der Bio|this weekend=dieses Wochenende|is here=ist da|is back=ist zurück|see you soon=bis bald|thank you=danke|good morning=guten Morgen|the=die|a=ein|our=unser|new=neu|is=ist|are=sind|here=hier|this=dieser|today=heute|tomorrow=morgen|week=Woche|weekend=Wochenende|coffee=Kaffee|free=gratis|with=mit|every=jeden|and=und|for=für|you=du|we=wir|your=dein|menu=Menü|now=jetzt|open=geöffnet|come=komm|join=mach mit|best=beste|morning=Morgen|mornings=Morgen|fresh=frisch|good=guter|more=mehr|in=in|at=um|on=am|to=zu|of=von|from=von|day=Tag|thanks=danke|friends=Freunde|friend=Freund|happy=fröhlich|slow=langsame|saturday=Samstag|sunday=Sonntag|autumn=Herbst|winter=Winter|blend=Mischung|names=Namen|help=helft|decide=entscheiden|hiring=stellen ein|roast=Röstung|year=Jahr|first=erstes|update=Update|hours=Öffnungszeiten|video=Video|pastry=Gebäck',
  pt: 'official trailer=trailer oficial|film=filme|movie=filme|trailer=trailer|watch=assista|tonight=hoje à noite|live=ao vivo|music=música|soundtrack=trilha sonora|cast=elenco|questions=perguntas|premiere=estreia|night=noite|everyone=todos|cinemas=cinemas|full=completo|favorite=favorito|shot=cena|behind the scenes=bastidores|link in bio=link na bio|this weekend=este fim de semana|is here=chegou|is back=está de volta|see you soon=até breve|thank you=obrigado|good morning=bom dia|the=o|a=um|our=nosso|new=novo|is=é|are=são|here=aqui|this=este|today=hoje|tomorrow=amanhã|week=semana|weekend=fim de semana|coffee=café|free=grátis|with=com|every=cada|and=e|for=para|you=você|we=nós|your=seu|menu=cardápio|now=agora|open=aberto|come=venha|join=junte-se|best=melhor|morning=manhã|mornings=manhãs|fresh=fresco|good=bom|more=mais|in=em|at=às|on=em|to=para|of=de|from=de|day=dia|thanks=obrigado|friends=amigos|friend=amigo|happy=feliz|slow=lentas|saturday=sábado|sunday=domingo|autumn=outono|winter=inverno|blend=blend|names=nomes|help=ajude|decide=decidir|hiring=contratando|roast=torra|year=ano|first=primeiro|update=novidade|hours=horários|video=vídeo|pastry=doce',
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const capitalized = (s: string) => s[0] !== s[0].toLowerCase();

async function translate(text: string, lang: Lang): Promise<string> {
  await think();
  const map = new Map(DICT[lang].split('|').map((pair) => pair.split('=') as [string, string]));
  const keys = [...map.keys()].sort((a, b) => b.length - a.length).map(escape);
  // ponytail: word-for-word dictionary, good enough to exercise the UI; a real model replaces this.
  return clean(text).replace(new RegExp(`\\b(${keys.join('|')})\\b`, 'gi'), (m) => {
    const to = map.get(m.toLowerCase())!;
    return capitalized(m) ? to[0].toUpperCase() + to.slice(1) : to;
  });
}

const STOP = new Set(
  'about after again also back been before being both bring come could does each even every first from have here into just like look looking made make many more most much need next only other over really still such than that their them then there these they thing think this those through time today tomorrow very want week well were what when where which while will with would year your yours ever didn know what’s that’s here’s we’re you’re'.split(
    ' ',
  ),
);
const TOPICS: [RegExp, string[]][] = [
  [/film|movie|cinema|feature/i, ['#film', '#filmmaking', '#cinema']],
  [/trailer/i, ['#movietrailer', '#comingsoon']],
  [/behind|on-set|shoot|camera/i, ['#behindthescenes', '#onset']],
  [/music|soundtrack|orchestra|album/i, ['#soundtrack', '#newmusic']],
  [/podcast|episode/i, ['#podcast', '#newepisode']],
  [/live|stream/i, ['#livestream']],
  [/premiere|screening/i, ['#premiere', '#premierenight']],
  [/casting|audition/i, ['#castingcall', '#acting']],
  [/hiring|editor/i, ['#hiring', '#videoeditor']],
];

async function hashtags(text: string): Promise<string[]> {
  await think();
  const existing = new Set((text.match(/#\w+/g) ?? []).map((t) => t.toLowerCase()));
  const words = (
    text
      .replace(/#\w+/g, '')
      .toLowerCase()
      .match(/[a-z]{4,}/g) ?? []
  ).filter((w) => !STOP.has(w));
  const topical = TOPICS.flatMap(([re, tags]) => (re.test(text) ? tags : []));
  return unique([
    ...topical,
    ...unique(words)
      .slice(0, 4)
      .map((w) => `#${w}`),
    '#multipostly',
    '#entertainment',
  ])
    .filter((t) => !existing.has(t))
    .slice(0, 12);
}

/** Trims to whole sentences under `limit`, dropping a trailing hashtag block first. */
export function fit(text: string, limit: number) {
  const t = clean(text);
  if (t.length <= limit) return t;
  let out = '';
  for (const s of sentences(t.replace(/(\s*#\w+)+\s*$/, ''))) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > limit) break;
    out = next;
  }
  return out || `${t.slice(0, limit - 1).replace(/\s+\S*$/, '')}…`;
}

async function shorten(text: string, limit: number) {
  await think();
  return fit(text, limit);
}

export const demoAI: AIProvider = { improve, translate, hashtags, shorten };
