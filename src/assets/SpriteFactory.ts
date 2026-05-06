import Phaser from 'phaser';

// Pixel-art sprite + tile atlas, generated at runtime onto canvas textures.
// Every sprite frame ends up as a real Phaser texture/frame, so all entities
// render through Phaser.GameObjects.Sprite and Phaser.Animations.

type Palette = Record<string, string>;
type Pixels = readonly string[];

const HERO_W = 16;
const HERO_H = 24;
const RAPTOR_W = 32;
const RAPTOR_H = 22;
const TREX_W = 64;
const TREX_H = 44;
const TILE_W = 32;
const TILE_H = 32;
const GOAL_W = 48;
const GOAL_H = 64;
const PROJECTILE_W = 8;
const PROJECTILE_H = 4;

const HERO_PALETTE: Palette = {
  '.': 'transparent',
  H: '#3a1f0a', // hat
  B: '#1a0a02', // hat band
  S: '#f3c79a', // skin
  E: '#111111', // eyes
  K: '#a8895a', // khaki shirt
  J: '#d4b07a', // shirt highlight
  P: '#26344f', // pants
  Q: '#1a2438', // pants shadow
  R: '#4a2a10', // boots
  T: '#2a1808', // boot dark
  G: '#3a2916', // belt
  W: '#cdcdcd', // gun metal
  C: '#101010', // outline
};

// 16 wide x 24 tall. Authored row-by-row.
// Frames: idle, run1, run2, jump, shoot, hurt
const HERO_FRAMES: Record<string, Pixels> = {
  idle: [
    '.....HHHHH......',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '..HBBBBBBBBBB...',
    '..HHHHHHHHHHHC..',
    '....SSSSSSS.....',
    '....SEESSEES....',
    '....SSSSSSS.....',
    '....SSSSSSS.....',
    '....KKKKKKK.....',
    '...KKJJJJJKK....',
    '...KKKKKKKKK....',
    '...KKKKKKKKK....',
    '...GGGGGGGGG....',
    '...PPPPPPPPP....',
    '...PPPPPPPPP....',
    '...PPQPP.PPP....',
    '...PPPPP.PPP....',
    '...PPPP..PPP....',
    '...PPPP..PPP....',
    '...PPPP..PPP....',
    '...RRRR..RRR....',
    '..TRRRR..RRRT...',
    '..TTTTT..TTTT...',
  ],
  run1: [
    '.....HHHHH......',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '..HBBBBBBBBBB...',
    '..HHHHHHHHHHHC..',
    '....SSSSSSS.....',
    '....SEESSEES....',
    '....SSSSSSS.....',
    '....SSSSSSS.....',
    '....KKKKKKK.....',
    '...KKJJJJJKK....',
    '..WKKKKKKKKK....',
    '.WWKKKKKKKKK....',
    '..WGGGGGGGGG....',
    '...PPPPPPPPP....',
    '...PPPPPPPPPP...',
    '...PPPPPPPPPPP..',
    '..PPPPP..PPPP...',
    '..PPPP....PPP...',
    '.PPPP......PP...',
    '.PPP.......PP...',
    'RRR........RR...',
    'TRR.........R...',
    'TT..............',
  ],
  run2: [
    '.....HHHHH......',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '..HBBBBBBBBBB...',
    '..HHHHHHHHHHHC..',
    '....SSSSSSS.....',
    '....SEESSEES....',
    '....SSSSSSS.....',
    '....SSSSSSS.....',
    '....KKKKKKK.....',
    '...KKJJJJJKK....',
    '...KKKKKKKKKW...',
    '...KKKKKKKKKWW..',
    '...GGGGGGGGGW...',
    '...PPPPPPPPP....',
    '..PPPPPPPPPPP...',
    '..PPPPPPPPPP....',
    '..PPP....PPPP...',
    '..PPP....PPPPP..',
    '..PP......PPPP..',
    '..PP.......PPP..',
    '..RR.......RRR..',
    '..R.........RRT.',
    '............TTT.',
  ],
  jump: [
    '.....HHHHH......',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '..HBBBBBBBBBB...',
    '..HHHHHHHHHHHC..',
    '....SSSSSSS.....',
    '....SEESSEES....',
    '....SSSSSSS.....',
    '....SSSSSSS.....',
    '....KKKKKKK.....',
    '...KKJJJJJKK....',
    '..WKKKKKKKKK....',
    '.WWKKKKKKKKK....',
    '..WGGGGGGGGG....',
    '...PPPPPPPPP....',
    '...PPPPPPPPP....',
    '...PPPPPPPPP....',
    '...PPP...PPPP...',
    '...PP.....PPP...',
    '...PP.....PPP...',
    '..PPP......PP...',
    '..RRR......RR...',
    '..TTRR......R...',
    '....TT..........',
  ],
  shoot: [
    '.....HHHHH......',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '..HBBBBBBBBBB...',
    '..HHHHHHHHHHHC..',
    '....SSSSSSS.....',
    '....SEESSEES....',
    '....SSSSSSS.....',
    '....SSSSSSS.....',
    '....KKKKKKK.....',
    '...KKJJJJJKKW...',
    '...KKKKKKKKKWW..',
    '...KKKKKKKKKWWW.',
    '...GGGGGGGGGW...',
    '...PPPPPPPPP....',
    '...PPPPPPPPP....',
    '...PPPPPPPPP....',
    '...PPPP..PPP....',
    '...PPPP..PPP....',
    '...PPPP..PPP....',
    '...PPPP..PPP....',
    '...RRRR..RRR....',
    '..TRRRR..RRRT...',
    '..TTTTT..TTTT...',
  ],
  hurt: [
    '....HHHHH.......',
    '...HHHHHHH......',
    '..HHHHHHHHHH....',
    '.HBBBBBBBBBB....',
    '.HHHHHHHHHHHHC..',
    '...SSSSSSS......',
    '...SEXXSXES.....',
    '...SSSSSSS......',
    '...SSSSSSS......',
    '..KKKKKKKK......',
    '..KKJJJJJKK.....',
    '..KKKKKKKKK.....',
    '..KKKKKKKKK.....',
    '..GGGGGGGGG.....',
    '..PPPPPPPPP.....',
    '..PPPPPPPPP.....',
    '...PPPPPPPP.....',
    '....PPP.PPP.....',
    '....PPP.PPP.....',
    '....PPP.PPP.....',
    '....PPP.PPP.....',
    '....RRR.RRR.....',
    '...TRRR.RRRT....',
    '...TTTT.TTTT....',
  ],
};
// Hurt frame uses 'X' for blood; map to red.
HERO_PALETTE.X = '#c33';

const RAPTOR_PALETTE: Palette = {
  '.': 'transparent',
  G: '#2f6f3a', // dark green
  L: '#5fa84a', // mid green
  H: '#8acb6a', // highlight
  B: '#e8e0c0', // belly
  E: '#f4d24a', // eye
  P: '#111111', // pupil/outline
  C: '#1a2a14', // shadow
  W: '#ffffff', // teeth
  R: '#992222', // claws/blood accent
};

// 32 wide x 22 tall.
const RAPTOR_FRAMES: Record<string, Pixels> = {
  walk1: [
    '...........GGGGG................',
    '..........GLLLLLLG..............',
    '.........GLLHHHLLG..............',
    '........GLLHHEPHLLG.............',
    '........GLLHHHHLLLG.............',
    '........GLWWLLLLLLLG............',
    '........CCCWLLLLLLLLG...........',
    '..........GLLLLLLLLLG...........',
    '....GGGG..GLLLBBBLLLG...........',
    '..GGLLLLGGGLLLBBBLLLLG..........',
    '.GLLLLLLLLLLBBBBBBBLLLG.........',
    'GLLHHHHHHLLLBBBBBBBLLLG.........',
    'GHLHLLLLLLLLLLBBBBBLLLG.........',
    '.GLLLLLLLLLLLLBBBBBLLLG.........',
    '..GGCCGGGCCGCCBBBLLLLG..........',
    '...GG...GG..GLLLLLLG............',
    '........GG..GLLLLG..............',
    '............GLLLG...............',
    '............GLLG................',
    '............GLG.................',
    '............GLG.................',
    '............RR..................',
  ],
  walk2: [
    '...........GGGGG................',
    '..........GLLLLLLG..............',
    '.........GLLHHHLLG..............',
    '........GLLHHEPHLLG.............',
    '........GLLHHHHLLLG.............',
    '........GLWWLLLLLLLG............',
    '........CCCWLLLLLLLLG...........',
    '..........GLLLLLLLLLG...........',
    '....GGGG..GLLLBBBLLLG...........',
    '..GGLLLLGGGLLLBBBLLLLG..........',
    '.GLLLLLLLLLLBBBBBBBLLLG.........',
    'GLLHHHHHHLLLBBBBBBBLLLG.........',
    'GHLHLLLLLLLLLLBBBBBLLLG.........',
    '.GLLLLLLLLLLLLBBBBBLLLG.........',
    '..GGCCGGGCCGCCBBBLLLLG..........',
    '....GGG...GG.GLLLLLLG...........',
    '......GG...GGGLLLLG.............',
    '.......GG...GGLLLG..............',
    '........GG...GLLG...............',
    '........GG...GLG................',
    '.........G...GLG................',
    '.............RR.................',
  ],
  walk3: [
    '...........GGGGG................',
    '..........GLLLLLLG..............',
    '.........GLLHHHLLG..............',
    '........GLLHHEPHLLG.............',
    '........GLLHHHHLLLG.............',
    '........GLWWLLLLLLLG............',
    '........CCCWLLLLLLLLG...........',
    '..........GLLLLLLLLLG...........',
    '....GGGG..GLLLBBBLLLG...........',
    '..GGLLLLGGGLLLBBBLLLLG..........',
    '.GLLLLLLLLLLBBBBBBBLLLG.........',
    'GLLHHHHHHLLLBBBBBBBLLLG.........',
    'GHLHLLLLLLLLLLBBBBBLLLG.........',
    '.GLLLLLLLLLLLLBBBBBLLLG.........',
    '..GGCCGGGCCGCCBBBLLLLG..........',
    '...GG......GG.GLLLLLG...........',
    '...GG.......GGLLLLG.............',
    '...GG........GLLLG..............',
    '..GG.........GLLG...............',
    '..GG..........LG................',
    '..GG..........LG................',
    '..............RR................',
  ],
  walk4: [
    '...........GGGGG................',
    '..........GLLLLLLG..............',
    '.........GLLHHHLLG..............',
    '........GLLHHEPHLLG.............',
    '........GLLHHHHLLLG.............',
    '........GLWWLLLLLLLG............',
    '........CCCWLLLLLLLLG...........',
    '..........GLLLLLLLLLG...........',
    '....GGGG..GLLLBBBLLLG...........',
    '..GGLLLLGGGLLLBBBLLLLG..........',
    '.GLLLLLLLLLLBBBBBBBLLLG.........',
    'GLLHHHHHHLLLBBBBBBBLLLG.........',
    'GHLHLLLLLLLLLLBBBBBLLLG.........',
    '.GLLLLLLLLLLLLBBBBBLLLG.........',
    '..GGCCGGGCCGCCBBBLLLLG..........',
    '....GG..GGG..GLLLLLLG...........',
    '....GG.GG....GLLLLG.............',
    '....GG.G......LLLG..............',
    '....G.G.......LLG...............',
    '....G.G.......LG................',
    '....G.G.......LG................',
    '..............RR................',
  ],
  hurt: [
    '...........XXXXX................',
    '..........XLLXXLLX..............',
    '.........XLXHHHLXX..............',
    '........XLXHHEPHXLX.............',
    '........XLXHHHHXLLX.............',
    '........XLWWLLXLLLLX............',
    '........XXXWLLLLLLLLX...........',
    '..........XLXLLLLLLLX...........',
    '....XXXX..XLLXBBXLLLX...........',
    '..XXLLLLXXXLLLBBBLLLLX..........',
    '.XLXLLLLLLLLBBXBBBLLLX..........',
    'XLLHHHHHHLLLBBBBBBBLLLX.........',
    'XHLHLLLLLLLLLLXBBBLLLX..........',
    '.XLLLLLLLLLLLLBBBBBLLLX.........',
    '..XXCCXXXCCXCCBBBLLLLX..........',
    '...XX...XX..XLLLLLLX............',
    '........XX..XLLLLX..............',
    '............XLLLX...............',
    '............XLLX................',
    '............XLX.................',
    '............XLX.................',
    '............RR..................',
  ],
};
RAPTOR_PALETTE.X = '#c44';

const TREX_PALETTE: Palette = {
  '.': 'transparent',
  D: '#5a3a1a', // dark brown
  M: '#8a5a30', // mid brown
  L: '#b88a55', // highlight
  B: '#e8d8b8', // belly
  E: '#e84020', // eye
  P: '#000000', // outline
  W: '#ffffff', // teeth
  R: '#b03020', // tongue/wound
  C: '#3a2410', // shadow
  X: '#c44',
};

// 64 wide x 44 tall. Big stomping T-Rex.
const TREX_FRAMES: Record<string, Pixels> = {
  walk1: [
    '....................................DDDDDDDD...................',
    '...................................DDMMMMMMMD..................',
    '..................................DMMMMLLMMMMD.................',
    '.................................DMMMLLLLLMMMMD................',
    '.................................DMMMLLLLLLMMMD................',
    '.................................DMMMLLLLLLMMMDD...............',
    '................................DMMMLLLLLLLLMMMD...............',
    '...............................DMMMLLLLEELLLMMMD...............',
    '...............................DMMMLLLLEPLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLWWWWWWWWWMMMD...............',
    '...............................CCCCWWWWWWWWWWWMD...............',
    '..................................DMMLLLLLLLMMMD...............',
    '..............DDD.................DMMMLLLLLLMMMD...............',
    '............DDMMMD................DMMMMMMMMMMMD................',
    '..........DDMMMLLMMD..............DMMMMMMMMMMMD................',
    '........DDMMMLLLLLMMMDD...........DMMMBBBBBBMMD.................',
    '......DDMMMMLLLLLLLLMMMMDD........DMMBBBBBBBBMD.................',
    '....DDMMMMMLLLLLLLLLLLLMMMMD......DMMBBBBBBBMMD.................',
    '.DDDMMMMLLLLLLLLLLLLLLLLLMMMMD....DMBBBBBBBBMD..................',
    'DDMMMMLLLLLLLBBBBBBBLLLLLLLMMMMD..DMBBBBBBBMMD..................',
    'DMMLLLLLLLLLBBBBBBBBBBLLLLLLLMMMD.DMMBBBBBMMMD..................',
    'DMLLLLLLLLLBBBBBBBBBBBBBLLLLLLLMMD.DMMMMMMMMMD..................',
    '.DMMLLLLLLLBBBBBBBBBBBBBBBLLLLLLMMD.DMMMMMMMD...................',
    '..DMMMMMMMMMMMBBBBBBBBBBBBBLLLLLMMMD.DMMMMMD....................',
    '...DDMMMMMMMMMMMMMBBBBBBBBBBBBLLMMMMD.DMMMD.....................',
    '......DCCCCCCCCCCCCCCCCCCCCCCCCMMMMD..DMMD......................',
    '...........................CCCMMMMMMD.DMD......................',
    '..........................DMMMMMMMMMD.DMMD.....................',
    '.........................DMMMMMMMMMD..DMMMD....................',
    '.........................DMMLLLMMMD....DMMMD...................',
    '.........................DMMLLLMMMD.....DMMMD..................',
    '.........................DMLLLLLMD......DMMMD..................',
    '........................DMMLLLLLMMD......DMMMD.................',
    '........................DMLLLLLLLMD.......DMMD.................',
    '........................DMMLLLLMMMD........DMD.................',
    '........................DMMMMMMMMMD........DMD.................',
    '........................DMMMMMMMMMD.........DD.................',
    '........................CCCCCCCCCCC............................',
    '................................................................',
    '................................................................',
    '................................................................',
  ],
  walk2: [
    '....................................DDDDDDDD...................',
    '...................................DDMMMMMMMD..................',
    '..................................DMMMMLLMMMMD.................',
    '.................................DMMMLLLLLMMMMD................',
    '.................................DMMMLLLLLLMMMD................',
    '.................................DMMMLLLLLLMMMDD...............',
    '................................DMMMLLLLLLLLMMMD...............',
    '...............................DMMMLLLLEELLLMMMD...............',
    '...............................DMMMLLLLEPLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLWWWWWWWWWMMMD...............',
    '...............................CCCCWWWWWWWWWWWMD...............',
    '..................................DMMLLLLLLLMMMD...............',
    '..............DDD.................DMMMLLLLLLMMMD...............',
    '............DDMMMD................DMMMMMMMMMMMD................',
    '..........DDMMMLLMMD..............DMMMMMMMMMMMD................',
    '........DDMMMLLLLLMMMDD...........DMMMBBBBBBMMD.................',
    '......DDMMMMLLLLLLLLMMMMDD........DMMBBBBBBBBMD.................',
    '....DDMMMMMLLLLLLLLLLLLMMMMD......DMMBBBBBBBMMD.................',
    '.DDDMMMMLLLLLLLLLLLLLLLLLMMMMD....DMBBBBBBBBMD..................',
    'DDMMMMLLLLLLLBBBBBBBLLLLLLLMMMMD..DMBBBBBBBMMD..................',
    'DMMLLLLLLLLLBBBBBBBBBBLLLLLLLMMMD.DMMBBBBBMMMD..................',
    'DMLLLLLLLLLBBBBBBBBBBBBBLLLLLLLMMD.DMMMMMMMMMD..................',
    '.DMMLLLLLLLBBBBBBBBBBBBBBBLLLLLLMMD.DMMMMMMMD...................',
    '..DMMMMMMMMMMMBBBBBBBBBBBBBLLLLLMMMD.DMMMMMD....................',
    '...DDMMMMMMMMMMMMMBBBBBBBBBBBBLLMMMMD.DMMMD.....................',
    '......DCCCCCCCCCCCCCCCCCCCCCCCCMMMMD..DMMD......................',
    '...........................CCCMMMMMMD.DMD......................',
    '...........................CMMMMMMMMD.DMMD.....................',
    '..........................DMMMMMMMMMD.DMMD.....................',
    '..........................DMMLLLMMMD..DMMMD....................',
    '..........................DMMLLLMMMD..DMMMD....................',
    '...........................DMMLLLMMD...DMMMD...................',
    '...........................DMLLLLLMD...DMMMMD..................',
    '....................DMMMM..DMLLLLLLMD....DMMMD.................',
    '...................DMMLLMMDDMMLLLLMMD.....DMMD.................',
    '..................DMLLLLLLMDMMMMMMMMD......DD..................',
    '..................DMLLLLLLLMMMMMMMMD............................',
    '..................CCCCCCCCCCCCCCCCCC............................',
    '................................................................',
    '................................................................',
    '................................................................',
  ],
  walk3: [
    '....................................DDDDDDDD...................',
    '...................................DDMMMMMMMD..................',
    '..................................DMMMMLLMMMMD.................',
    '.................................DMMMLLLLLMMMMD................',
    '.................................DMMMLLLLLLMMMD................',
    '.................................DMMMLLLLLLMMMDD...............',
    '................................DMMMLLLLLLLLMMMD...............',
    '...............................DMMMLLLLEELLLMMMD...............',
    '...............................DMMMLLLLEPLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLWWWWWWWWWMMMD...............',
    '...............................CCCCWWWWWWWWWWWMD...............',
    '..................................DMMLLLLLLLMMMD...............',
    '..............DDD.................DMMMLLLLLLMMMD...............',
    '............DDMMMD................DMMMMMMMMMMMD................',
    '..........DDMMMLLMMD..............DMMMMMMMMMMMD................',
    '........DDMMMLLLLLMMMDD...........DMMMBBBBBBMMD.................',
    '......DDMMMMLLLLLLLLMMMMDD........DMMBBBBBBBBMD.................',
    '....DDMMMMMLLLLLLLLLLLLMMMMD......DMMBBBBBBBMMD.................',
    '.DDDMMMMLLLLLLLLLLLLLLLLLMMMMD....DMBBBBBBBBMD..................',
    'DDMMMMLLLLLLLBBBBBBBLLLLLLLMMMMD..DMBBBBBBBMMD..................',
    'DMMLLLLLLLLLBBBBBBBBBBLLLLLLLMMMD.DMMBBBBBMMMD..................',
    'DMLLLLLLLLLBBBBBBBBBBBBBLLLLLLLMMD.DMMMMMMMMMD..................',
    '.DMMLLLLLLLBBBBBBBBBBBBBBBLLLLLLMMD.DMMMMMMMD...................',
    '..DMMMMMMMMMMMBBBBBBBBBBBBBLLLLLMMMD.DMMMMMD....................',
    '...DDMMMMMMMMMMMMMBBBBBBBBBBBBLLMMMMD.DMMMD.....................',
    '......DCCCCCCCCCCCCCCCCCCCCCCCCMMMMD..DMMD......................',
    '...........................CCCMMMMMMD.DMD......................',
    '..........................DMMMMMMMMMMDDMMD.....................',
    '.........................DMMMMMMMMMMD..DMMD....................',
    '.........................DMMLLLLMMMD...DMMMD...................',
    '........................DMMLLLLLMMMD....DMMMD..................',
    '.......................DMMLLLLLLLMMD.....DMMMD.................',
    '......................DMLLLLLLLLLMMD......DMMD.................',
    '.....................DMMLLLLLLLLMMMD.......DMD.................',
    '....................DMMLLLLLLLLLMMMD........DD.................',
    '....................DMMMMMMMMMMMMMD.............................',
    '....................CCCCCCCCCCCCCCC.............................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
  ],
  roar: [
    '....................................DDDDDDDD...................',
    '...................................DDMMMMMMMD..................',
    '..................................DMMMMLLMMMMD.................',
    '............................DDDD.DMMMLLLLLMMMMD................',
    '..........................DDMMMMDDMMMLLLLLLMMMD................',
    '.........................DMMMLLLLDDMMLLLLLLMMMDD...............',
    '........................DMMLLLLLLLDMMLLLLLLLLMMMD..............',
    '........................DMLWWWWWWWWLLLLEELLLMMMMD..............',
    '........................DMLWWWWWWWWLLLEEPLLLLMMMD..............',
    '........................DMLWWRRWWWWLLLLLLLLLLLMMD..............',
    '........................DMLWWRRWWWWLLLLLLLLLLLMMD..............',
    '........................DMLWWWWWWWWLLLLLLLLLLLMMD..............',
    '........................DMLWWWWWWWWMMMMMMMMMMMMMD..............',
    '........................DMMWWWWWWWMMMMMMMMMMMMMMD..............',
    '........................CCCMMMMMMMMMLLLLLLLMMMMMD..............',
    '..............DDD.................DMMMLLLLLLMMMD...............',
    '............DDMMMD................DMMMMMMMMMMMD................',
    '..........DDMMMLLMMD..............DMMMMMMMMMMMD................',
    '........DDMMMLLLLLMMMDD...........DMMMBBBBBBMMD.................',
    '......DDMMMMLLLLLLLLMMMMDD........DMMBBBBBBBBMD.................',
    '....DDMMMMMLLLLLLLLLLLLMMMMD......DMMBBBBBBBMMD.................',
    '.DDDMMMMLLLLLLLLLLLLLLLLLMMMMD....DMBBBBBBBBMD..................',
    'DDMMMMLLLLLLLBBBBBBBLLLLLLLMMMMD..DMBBBBBBBMMD..................',
    'DMMLLLLLLLLLBBBBBBBBBBLLLLLLLMMMD.DMMBBBBBMMMD..................',
    'DMLLLLLLLLLBBBBBBBBBBBBBLLLLLLLMMD.DMMMMMMMMMD..................',
    '.DMMLLLLLLLBBBBBBBBBBBBBBBLLLLLLMMD.DMMMMMMMD...................',
    '..DMMMMMMMMMMMBBBBBBBBBBBBBLLLLLMMMD.DMMMMMD....................',
    '...DDMMMMMMMMMMMMMBBBBBBBBBBBBLLMMMMD.DMMMD.....................',
    '......DCCCCCCCCCCCCCCCCCCCCCCCCMMMMD..DMMD......................',
    '...........................CCCMMMMMMD.DMD......................',
    '..........................DMMMMMMMMMD.DMMD.....................',
    '.........................DMMMMMMMMMD..DMMMD....................',
    '.........................DMMLLLMMMD....DMMMD...................',
    '.........................DMMLLLMMMD.....DMMMD..................',
    '.........................DMLLLLLMD......DMMMD..................',
    '........................DMMLLLLLMMD......DMMMD.................',
    '........................DMLLLLLLLMD.......DMMD.................',
    '........................DMMLLLLMMMD........DMD.................',
    '........................DMMMMMMMMMD........DMD.................',
    '........................DMMMMMMMMMD.........DD.................',
    '........................CCCCCCCCCCC............................',
    '................................................................',
    '................................................................',
    '................................................................',
  ],
  hurt: [
    '....................................DDDDDDDD...................',
    '...................................DDMMMMMMMD..................',
    '..................................DMMMMLLMMMMD.................',
    '.................................DMMMLLLLLMMMMD................',
    '.................................DMMMLLLLLLMMMD................',
    '.................................DMMMLLLLLLMMMDD...............',
    '................................DMMMLLLLLLLLMMMD...............',
    '...............................DMMMLLLLEELLLMMMD...............',
    '...............................DMMMLLLLEPLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLXXXLLLLLLLMMD...............',
    '...............................DMMLXXXLLLLLLLMMD...............',
    '...............................DMMLLLLLLLLLLLMMD...............',
    '...............................DMMLWWWWWWWWWMMMD...............',
    '...............................CCCCWWWWWWWWWWWMD...............',
    '..................................DMMLLLLLLLMMMD...............',
    '..............DDD.................DMMMLLLLLLMMMD...............',
    '............DDMMMD................DMMMMMMMMMMMD................',
    '..........DDMMMLLMMD..............DMMMMMMMMMMMD................',
    '........DDMMMLLLLLMMMDD...........DMMMBBBBBBMMD.................',
    '......DDMMMMLLLLLLLLMMMMDD........DMMBBXBBXBBMD.................',
    '....DDMMMMMLLLLLLLLLLLLMMMMD......DMMBBBBBBBMMD.................',
    '.DDDMMMMLLLLLLLLLLLLLLLLLMMMMD....DMBBBBXBBMD..................',
    'DDMMMMLLLLLLLBBBBBBBLLLLLLLMMMMD..DMBBBBBBBMMD..................',
    'DMMLLLLLLLLLBBBBBBBBBBLLLLLLLMMMD.DMMBBBBBMMMD..................',
    'DMLLLLLLLLLBBBBBBBBBBBBBLLLLLLLMMD.DMMMMMMMMMD..................',
    '.DMMLLLLLLLBBBBBBBBBBBBBBBLLLLLLMMD.DMMMMMMMD...................',
    '..DMMMMMMMMMMMBBBBBBBBBBBBBLLLLLMMMD.DMMMMMD....................',
    '...DDMMMMMMMMMMMMMBBBBBBBBBBBBLLMMMMD.DMMMD.....................',
    '......DCCCCCCCCCCCCCCCCCCCCCCCCMMMMD..DMMD......................',
    '...........................CCCMMMMMMD.DMD......................',
    '...........................CMMMMMMD.DMMD.....................',
    '..........................DMMMMMMMMMD.DMMD.....................',
    '..........................DMMLLLMMMD..DMMMD....................',
    '..........................DMMLLLMMMD..DMMMD....................',
    '...........................DMMLLLMMD...DMMMD...................',
    '...........................DMLLLLLMD...DMMMMD..................',
    '....................DMMMM..DMLLLLLLMD....DMMMD.................',
    '...................DMMLLMMDDXMMLLLLMMD.....DMMD.................',
    '..................DMLLLLLLMDXMMMMMMMD......DD..................',
    '..................DMLLLLLLLMMXMMMMD............................',
    '..................CCCCCCCCCCCCCCCCCC............................',
    '................................................................',
    '................................................................',
    '................................................................',
  ],
};

const TILE_PALETTE: Palette = {
  '.': 'transparent',
  G: '#3aa53a',
  g: '#2d8a2d',
  H: '#5fd05f',
  D: '#7a4a25',
  d: '#5a341a',
  M: '#8b5a2a',
  S: '#888888',
  s: '#5a5a5a',
  K: '#aaaaaa',
  R: '#c0392b',
  r: '#7a2018',
  Y: '#f5c14a',
  W: '#ffffff',
  P: '#cdcdcd',
  L: '#dde0c7',
  B: '#000000',
};

const TILE_FRAMES: Record<string, Pixels> = {
  // Grass top: top half grass, bottom half dirt edge
  grass: [
    'HGGHGGHHGGHGGHGGHGGGHGGHGGGHHGGH',
    'GHGGHHGGHGHGGHHGGHHGGGHHGHGGGHHG',
    'GGHGGHGGHGGHGGHHGGHGGHGGHGGHGGHG',
    'gggGggggGgggggGgggGgggGgggGggggG',
    'GgggggGggggGggggGggggGggGggGgggG',
    'gggggggggggggggggggggggggggggggg',
    'DdDDdDdDDdDdDDdDdDdDDdDdDDdDdDdD',
    'DDdDDdDdDdDDdDdDdDDdDdDdDDdDDdDd',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
  ],
  dirt: [
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
    'DdDDdMdDdDdMdDdDdMdDdDdMdDdMdDdD',
    'dDdMdDdDdMdDdMdDdDdMdDdDdMdDdDdM',
  ],
  // Wooden / stone platform (one tile)
  platform: [
    'sSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSs',
    'SKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKS',
    'SKPPPPPPPPPPPPPPPPPPPPPPPPPPPPKS',
    'SKPPPPLPPPPPPPLPPPPPPPLPPPPPPPKS',
    'SKPPPPPPPPPLPPPPPPPPPPPPPPPLPPKS',
    'SKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKS',
    'sSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSs',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
  spike: [
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '...K..........K.........K.......',
    '...KK........KKK........KK......',
    '..KKK.........KK.......KKK......',
    '..KKK........KKKK......KKKK.....',
    '.KKKKK......KKKKK.....KKKKK.....',
    '.KKKKK.....KKKKKK....KKKKKKK....',
    'KKKKKKK....KKKKKK....KKKKKKK....',
    'KKKKKKKK..KKKKKKKK..KKKKKKKKK...',
    'sssssssssssssssssssssssssssssss.',
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ],
};

const GOAL_PALETTE: Palette = {
  '.': 'transparent',
  P: '#cdcdcd', // pole
  p: '#888888',
  R: '#dc2626',
  r: '#7a1010',
  W: '#ffffff',
  Y: '#fde047',
  B: '#000000',
};

const GOAL_FRAMES: Record<string, Pixels> = {
  flag: [
    '...........PP...................................',
    '...........PP...................................',
    '...........PPRRRRRRRRRRRRRRRRRR.................',
    '...........PPRWWWWWWWWWWWWWWWWR.................',
    '...........PPRWYYYYYYYYYYYYYYWR.................',
    '...........PPRWYYYYYYYYYYYYYYWR.................',
    '...........PPRWYYWWWWWWWWWYYYWR.................',
    '...........PPRWYYWBBBBBBBWYYYWR.................',
    '...........PPRWYYWBYYYYYBWYYYWR.................',
    '...........PPRWYYWBYBBYBBWYYYWR.................',
    '...........PPRWYYWBYYYYYBWYYYWR.................',
    '...........PPRWYYWBBBBBBBWYYYWR.................',
    '...........PPRWYYWWWWWWWWWYYYWR.................',
    '...........PPRWYYYYYYYYYYYYYYWR.................',
    '...........PPRWYYYYYYYYYYYYYYWR.................',
    '...........PPRWWWWWWWWWWWWWWWWR.................',
    '...........PPRRRRRRRRRRRRRRRRRR.................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
    '...........PP...................................',
  ],
};

const PROJECTILE_PALETTE: Palette = {
  '.': 'transparent',
  Y: '#fde047',
  W: '#ffffff',
  O: '#f59e0b',
};

const PROJECTILE_FRAMES: Record<string, Pixels> = {
  bolt: [
    '..YYYYY.',
    '.YWWWWWO',
    '.YWWWWWO',
    '..YYYYY.',
  ],
};

const TREE_PALETTE: Palette = {
  '.': 'transparent',
  T: '#3a2410',
  t: '#5a3618',
  L: '#1a5a1a',
  l: '#2d8a2d',
  H: '#5fd05f',
};

const TREE_FRAMES: Record<string, Pixels> = {
  tree: [
    '.........LLLLLL.................',
    '........LlllllllL...............',
    '.......LllHHHHllllL.............',
    '......LllHHlllHHlllL............',
    '.....LllHHlllllHlllllL..........',
    '.....LllllllllllllllL...........',
    '....LllHHlllllllllllLL..........',
    '....LlllllllllllllllllL.........',
    '...LllHHllllllllllHHlllL........',
    '...LllllllllllllllllllllL.......',
    '..LllllHlllllllllllHlllllL......',
    '..LlllllllllllllllllllllllL.....',
    '..Lllllllllllllllllllllllll.....',
    '...LlllllllllllllllllllllL......',
    '....LllllllllllllllllllllL......',
    '.....LlllllllllllllllllL........',
    '......LlllllllllllllllL.........',
    '........LlllllllllllL...........',
    '.........LlllllllllL............',
    '...........TTTtttTT.............',
    '...........TtttTTtT.............',
    '...........TTttttTT.............',
    '...........TTttTTTt.............',
    '...........TTtttttT.............',
    '...........TtTTttTt.............',
    '...........TTtttttT.............',
    '...........TTttTtTT.............',
    '...........TtttttTt.............',
    '...........TTtTttTT.............',
    '..........TTTtttTtTT............',
    '.........TTttttTTttT............',
    '........TTTtTtTttTtTT...........',
  ],
};

function drawPixelArt(ctx: CanvasRenderingContext2D, art: Pixels, palette: Palette, ox: number, oy: number) {
  for (let row = 0; row < art.length; row += 1) {
    const line = art[row];
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col];
      const color = palette[ch];
      if (!color || color === 'transparent') continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + col, oy + row, 1, 1);
    }
  }
}

function buildAtlas(
  scene: Phaser.Scene,
  key: string,
  frameWidth: number,
  frameHeight: number,
  frameNames: string[],
  pixels: Record<string, Pixels>,
  palette: Palette,
) {
  const cols = frameNames.length;
  const canvasTex = scene.textures.createCanvas(key, frameWidth * cols, frameHeight);
  if (!canvasTex) {
    throw new Error(`Failed to create canvas texture ${key}`);
  }
  const ctx = canvasTex.getContext();
  ctx.imageSmoothingEnabled = false;

  frameNames.forEach((frameName, index) => {
    const art = pixels[frameName];
    if (!art) {
      throw new Error(`Missing pixel art for ${key}.${frameName}`);
    }
    drawPixelArt(ctx, art, palette, index * frameWidth, 0);
    canvasTex.add(frameName, 0, index * frameWidth, 0, frameWidth, frameHeight);
  });

  canvasTex.refresh();
  canvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return canvasTex;
}

export function buildSpriteAtlas(scene: Phaser.Scene) {
  buildAtlas(
    scene,
    'hero',
    HERO_W,
    HERO_H,
    ['idle', 'run1', 'run2', 'jump', 'shoot', 'hurt'],
    HERO_FRAMES,
    HERO_PALETTE,
  );

  buildAtlas(
    scene,
    'raptor',
    RAPTOR_W,
    RAPTOR_H,
    ['walk1', 'walk2', 'walk3', 'walk4', 'hurt'],
    RAPTOR_FRAMES,
    RAPTOR_PALETTE,
  );

  buildAtlas(
    scene,
    'trex',
    TREX_W,
    TREX_H,
    ['walk1', 'walk2', 'walk3', 'roar', 'hurt'],
    TREX_FRAMES,
    TREX_PALETTE,
  );

  buildAtlas(
    scene,
    'tiles',
    TILE_W,
    TILE_H,
    ['grass', 'dirt', 'platform', 'spike'],
    TILE_FRAMES,
    TILE_PALETTE,
  );

  buildAtlas(scene, 'goal', GOAL_W, GOAL_H, ['flag'], GOAL_FRAMES, GOAL_PALETTE);

  buildAtlas(
    scene,
    'projectile',
    PROJECTILE_W,
    PROJECTILE_H,
    ['bolt'],
    PROJECTILE_FRAMES,
    PROJECTILE_PALETTE,
  );

  buildAtlas(scene, 'tree', TILE_W, TILE_H, ['tree'], TREE_FRAMES, TREE_PALETTE);

  // Animations are global by default.
  if (!scene.anims.exists('hero-idle')) {
    scene.anims.create({
      key: 'hero-idle',
      frames: [{ key: 'hero', frame: 'idle' }],
      frameRate: 1,
      repeat: -1,
    });
    scene.anims.create({
      key: 'hero-run',
      frames: [
        { key: 'hero', frame: 'run1' },
        { key: 'hero', frame: 'idle' },
        { key: 'hero', frame: 'run2' },
        { key: 'hero', frame: 'idle' },
      ],
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: 'hero-jump',
      frames: [{ key: 'hero', frame: 'jump' }],
      frameRate: 1,
      repeat: 0,
    });
    scene.anims.create({
      key: 'hero-shoot',
      frames: [{ key: 'hero', frame: 'shoot' }],
      frameRate: 1,
      repeat: 0,
    });
    scene.anims.create({
      key: 'hero-hurt',
      frames: [{ key: 'hero', frame: 'hurt' }],
      frameRate: 1,
      repeat: 0,
    });

    scene.anims.create({
      key: 'raptor-walk',
      frames: [
        { key: 'raptor', frame: 'walk1' },
        { key: 'raptor', frame: 'walk2' },
        { key: 'raptor', frame: 'walk3' },
        { key: 'raptor', frame: 'walk4' },
      ],
      frameRate: 8,
      repeat: -1,
    });
    scene.anims.create({
      key: 'raptor-hurt',
      frames: [{ key: 'raptor', frame: 'hurt' }],
      frameRate: 1,
      repeat: 0,
    });

    scene.anims.create({
      key: 'trex-walk',
      frames: [
        { key: 'trex', frame: 'walk1' },
        { key: 'trex', frame: 'walk2' },
        { key: 'trex', frame: 'walk3' },
        { key: 'trex', frame: 'walk2' },
      ],
      frameRate: 4,
      repeat: -1,
    });
    scene.anims.create({
      key: 'trex-roar',
      frames: [{ key: 'trex', frame: 'roar' }],
      frameRate: 1,
      repeat: 0,
    });
    scene.anims.create({
      key: 'trex-hurt',
      frames: [{ key: 'trex', frame: 'hurt' }],
      frameRate: 1,
      repeat: 0,
    });
  }
}

export const SPRITE_DIMENSIONS = {
  hero: { width: HERO_W, height: HERO_H },
  raptor: { width: RAPTOR_W, height: RAPTOR_H },
  trex: { width: TREX_W, height: TREX_H },
  tile: { width: TILE_W, height: TILE_H },
  goal: { width: GOAL_W, height: GOAL_H },
  projectile: { width: PROJECTILE_W, height: PROJECTILE_H },
} as const;
