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
  H: '#4a2a15', // hat - warm brown
  B: '#a52a2a', // bandana - red from cover
  S: '#c8956d', // skin - tanned
  E: '#111111', // eyes
  K: '#e8dcc8', // cream shirt from cover
  J: '#f5e6d3', // shirt highlight
  P: '#6b4423', // pants - earthy brown
  Q: '#4a3018', // pants shadow
  R: '#3d2817', // boots - dark brown
  T: '#2a1a0f', // boot dark
  G: '#5c3a1e', // belt
  W: '#cdcdcd', // gun metal
  C: '#1a120a', // outline - warm dark
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
  G: '#2f2a16', // dark olive outline
  L: '#8b7a3e', // JP-inspired tawny scales
  H: '#c7a96b', // warm scale highlight
  B: '#e2c994', // pale underside
  E: '#f4c430', // amber eye
  P: '#100c08', // pupil / mouth cut
  C: '#44351e', // dark stripes
  W: '#fff4d0', // teeth
  R: '#b03020', // sickle claws / wound accent
};

// 32 wide x 22 tall. Long skull, raised tail, striped back, hooked arms,
// and sickle-clawed running poses for a movie-raptor silhouette.
const RAPTOR_FRAMES: Record<string, Pixels> = {
  walk1: [
    '................................',
    '................................',
    '....GGGGGGG.....................',
    'GGGGGLLLLLGGG................GGG',
    'GHHHHHHHHLLLGG.............GGGLG',
    'HHHHHHHEPLLLLG..........GGGGLHLG',
    'LLLLLLLLLLLLLGGGGGGGG.GGGHCHCLLG',
    'GPPPPPPPPPLLGGLHHHHLGGGHHCCLLLGG',
    '.GWBWBWBLLHHHHHHHHCHHHCHCCLLGGG.',
    '.GGGGGGLLLLLLLHCHCHHCCCLLLLGG...',
    '......GGLLLLLCLLLCLCLCLLLGGG....',
    '....GGGGGLLLLLLLLLLLLLLLGG......',
    '....GLLGGLLLLBBBBBBBBBLLG.......',
    '....GGGLLGLBBBBBBBBBBBBLG.......',
    '......GGGLGBBBBBBBBBBLBBG.......',
    '........GLGGGLBLLLBBLLLLGG......',
    '........GGG.GGLLLLGGGGLLLGG.....',
    '............GLLLLGG..GLLLLGG....',
    '...........GGLLLGG...GGLLLLGGG..',
    '.........GGGLLLGG.....GGLLLLLGGG',
    '......GGGGLLLGGG.......GGGLLLLLR',
    '......GRLLGGGG...........GGGGGGG',
  ],
  walk2: [
    '................................',
    '................................',
    '....GGGGGGG.....................',
    'GGGGGLLLLLGGG................GGG',
    'GHHHHHHHHLLLGG.............GGGLG',
    'HHHHHHHEPLLLLG..........GGGGLHLG',
    'LLLLLLLLLLLLLGGGGGGGG.GGGHCHCLLG',
    'GPPPPPPPPPLLGGLHHHHLGGGHHCCLLLGG',
    '.GWBWBWBLLHHHHHHHHCHHHCHCCLLGGG.',
    '.GGGGGGLLLLLLLHCHCHHCCCLLLLGG...',
    '......GGLLLLLCLLLCLCLCLLLGGG....',
    '....GGGGGLLLLLLLLLLLLLLLGG......',
    '....GLLGGLLLLBBBBBBBBBLLG.......',
    '....GGGLLGLBBBBBBBBBBBBLG.......',
    '......GGGLGBBBBBBBBBBBLBG.......',
    '........GLGGGLBLLLBBLLLLG.......',
    '........GGG.GGGLLLGGLLLLG.......',
    '..............GLLLGGLLLGG.......',
    '..............GLLLGGLLLG........',
    '..............GGLLLLLLGG........',
    '..............GGGLLLLGGGG.......',
    '..............GRLLGGGLLRG.......',
  ],
  walk3: [
    '................................',
    '................................',
    '....GGGGGGG.....................',
    'GGGGGLLLLLGGG................GGG',
    'GHHHHHHHHLLLGG.............GGGLG',
    'HHHHHHHEPLLLLG..........GGGGLHLG',
    'LLLLLLLLLLLLLGGGGGGGG.GGGHCHCLLG',
    'GPPPPPPPPPLLGGLHHHHLGGGHHCCLLLGG',
    '.GWBWBWBLLHHHHHHHHCHHHCHCCLLGGG.',
    '.GGGGGGLLLLLLLHCHCHHCCCLLLLGG...',
    '......GGLLLLLCLLLCLCLCLLLGGG....',
    '....GGGGGLLLLLLLLLLLLLLLGG......',
    '....GLLGGLLLLBBBBBBBBBLLG.......',
    '....GGGLLGLBBBBBBBBBBBBLG.......',
    '......GGGLGBBBBBBBBBBLBBG.......',
    '........GLGGGLBLLLBBLLLLG.......',
    '........GGGGGGLLLGGGGLLLG.......',
    '..........GGLLLLGG..GLLLG.......',
    '.........GGLLLLGG...GLLLG.......',
    '........GGLLLLGG....GGLLGG......',
    '.....GGGGLLLGGG......GGLLGGGGGG.',
    '.....GRLLLLGG.........GGLLLLLRG.',
  ],
  walk4: [
    '................................',
    '................................',
    '....GGGGGGG.....................',
    'GGGGGLLLLLGGG................GGG',
    'GHHHHHHHHLLLGG.............GGGLG',
    'HHHHHHHEPLLLLG..........GGGGLHLG',
    'LLLLLLLLLLLLLGGGGGGGG.GGGHCHCLLG',
    'GPPPPPPPPPLLGGLHHHHLGGGHHCCLLLGG',
    '.GWBWBWBLLHHHHHHHHCHHHCHCCLLGGG.',
    '.GGGGGGLLLLLLLHCHCHHCCCLLLLGG...',
    '......GGLLLLLCLLLCLCLCLLLGGG....',
    '....GGGGGLLLLLLLLLLLLLLLGG......',
    '....GLLGGLLLLBBBBBBBBBLLG.......',
    '....GGGLLGLBBBBBBBBBBBBLG.......',
    '......GGGLGBBBBBBBBBBBLBG.......',
    '........GLGGGLBLLLBBLLLLG.......',
    '........GGG.GGGLLLGGLLLGG.......',
    '..............GGLLGLLLGG........',
    '...............GLLLLLGG.........',
    '..............GGGLLLGG..........',
    '...........GGGGLLGGLLGGGGGG.....',
    '...........GRLLGGGGGLLLLLRG.....',
  ],
  hurt: [
    '................................',
    '................................',
    '....GGGGGGG.....................',
    'GGGGGLLLLLGGG................GGG',
    'GHHHHHHHHLLLGG.............GGGLG',
    'HHHHHHHEPLXXLG..........GGGGLHLG',
    'LLLLLLLLLLLLLGGGGGGGG.GGGHCHCLLG',
    'GPPPPPPPPPLLGGLHHHHLGGGHHCCLLLGG',
    '.GWBWBWBLLHHHHHHHHCHHHCHCCLLGGG.',
    '.GGGGGGLLLLLLLHCHCHHCCCLLLLGG...',
    '......GGLLLLLCLLLCXCLCLLLGGG....',
    '....GGGGGLLLLLLLLLLXLLLLGG......',
    '....GLLGGLLLLBBBBBBBBBLLG.......',
    '....GGGLLGLBBBBBBBBBBBBLG.......',
    '......GGGLGBBBBBBBBBBLBXG.......',
    '........GLGGGLBLLLBBLLLLGG......',
    '........GGG.GGLLLLGGGGLLLGG.....',
    '............GLLLLGG..GLLLLGG....',
    '...........GGLXLGG...GGLLLLGGG..',
    '.........GGGLLLGG.....GGLLLLLGGG',
    '......GGGGLLLGGG.......GGGLLLLLR',
    '......GRLLGGGG...........GGGGGGG',
  ],
};
RAPTOR_PALETTE.X = '#c44';

const TREX_PALETTE: Palette = {
  '.': 'transparent',
  D: '#503018', // dark brown outline
  M: '#8b5223', // deep brown scales
  L: '#9a8a44', // olive-tan head/back highlight
  B: '#e4ca8f', // pale belly
  E: '#f4d24a', // eye
  P: '#090604', // mouth shadow / pupil
  W: '#fff4d0', // teeth
  R: '#b03020', // tongue / claws / wound accent
  C: '#3f2d18', // back stripes
  X: '#c44',
};

// 64 wide x 44 tall. Iconic T-Rex proportions: huge boxy skull,
// tiny two-finger arms, heavy thighs, and a long counterbalancing tail.
const TREX_FRAMES: Record<string, Pixels> = {
  walk1: [
    '................................................................',
    '................................................................',
    '................................................................',
    '...........DDDDDDDDDDDD.........................................',
    '..DDDDDDDDDDMMMMMMMMMMDDD.......................................',
    '.DDMLLLLLLLLLLLLLLLMMMMMDD......................................',
    '.DMLLLLLLLLLLLLLLLLCLMMMMDDD....................................',
    'DDMLLLLLLLLLLLLLLLLLCLLMMMMDDD...............................DDD',
    'DMLLLLLLLLLLLLLLLEPLCLLLLMMMMDD............................DDDMD',
    'MMMMLLLLLLLLLLLLLLLLLCMMCMMMMMD.........................DDDDMMMD',
    'MMMMMPMLLLLLLLLLLLMMMCMCMMMMMMD.......................DDDMMLLMMD',
    'DMMMMMMMMMMMMMMMMMMMMMMCMMMMMDD.....................DDDMLLLMMMMD',
    'DPPPPPPPPPPPPPPPMMMMMMCMMMMMMD.DDDDDD............DDDDLLCLCMMMMMD',
    '.PPWPPWPPWPPWPPPPPPPMMCMMMMMMDDDLLLLDDDDD.....DDDDLLLLCMMMMMMMDD',
    'DPPPPPPPPPPPPPPPWPPPPPPPMMMMDLLLLLLLLLLLDDDDDDDLLLLLLCCMMMMMMDD.',
    'DMMMMMMPPPPPPPPPPPPPWMMMMMMMLLLLLLLLLCLLLLLLLLLLLCLLMCMMMMMDDD..',
    'DMMMMWMMMMWMMMMMMMMMMMMMMLLMLLLLLLCLCLLLLCLCLLLLCCMMMMMMMMDD....',
    'MMMMMMMMMMMMMMMWMMMWMMMMMMMMLLCLLLLLCLLLLLCLLCLLCMMMMMMMDDD.....',
    'DDMMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLCLLLCLLCLLLLCMMMMMMMDD.......',
    '.DDDDDMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLCLCLLLLMMMMMDDD........',
    '.....DDDDDDDDDDDMMMMMMMMMMMMMLLLLLLLLLLLLCLLLLLCMMMDDD..........',
    '...............DMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD............',
    '...............DDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '................DDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMD.............',
    '..............DDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '..........DDDDDMMMMMMMMMMMMBBBBBBBBBBBBBBBBMMMMMMD..............',
    '..........DMMMMMMMMMMMMMMMBBBBBBBBBBBBBBBBBBMMMMMD..............',
    '..........DDDMMMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBMMMDD..............',
    '............DMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBBBBMDD...............',
    '...........DDMDDMDDDDBBBBBBBBBBBBBBBBBBBBBBBBBBDD...............',
    '...........DMDDDDD..DDBBBBBBBBBBBBBBBBBBBBMMMBBBDD..............',
    '...........DDD.......DDDBBBBBMMMMMMMBBBBBBMMMMMMMD..............',
    '.......................DDDBBBMMMMMMMBBBBBBBMMMMMMDD.............',
    '.........................DDBBMMMMMMMBBBBBBBMMMMMMMD.............',
    '..........................DDDMMMMMMMBBBBBBBMMMMMMMD.............',
    '............................DMMMMMMMDDDDDDDDMMMMMMDD............',
    '............................DMMMMMMMD......DMMMMMMMD............',
    '...........................DDMMMMMMMD......DDMMMMMMDD...........',
    '...........................DMMMMMMMMD.......DMMMMMMMDDD.........',
    '..........................DDMMMMMMMDD.......DDMMMMMMMMDDDD......',
    '..........................DMMMMMMMDD.........DDMMMMMMMMMMDDDDDDD',
    '................DDDDDDDDDDDMMMMMMDD...........DDDMMMMMMMMMMMMMMM',
    '................DMMMMMMMMMMMMMMMDD..............DDDDDDMMMMMMMMMR',
    '................DMRMMMMMMMMMMDDDD....................DMMMMMMMMMM',
  ],
  walk2: [
    '................................................................',
    '................................................................',
    '................................................................',
    '...........DDDDDDDDDDDD.........................................',
    '..DDDDDDDDDDMMMMMMMMMMDDD.......................................',
    '.DDMLLLLLLLLLLLLLLLMMMMMDD......................................',
    '.DMLLLLLLLLLLLLLLLLCLMMMMDDD....................................',
    'DDMLLLLLLLLLLLLLLLLLCLLMMMMDDD...............................DDD',
    'DMLLLLLLLLLLLLLLLEPLCLLLLMMMMDD............................DDDMD',
    'MMMMLLLLLLLLLLLLLLLLLCMMCMMMMMD.........................DDDDMMMD',
    'MMMMMPMLLLLLLLLLLLMMMCMCMMMMMMD.......................DDDMMLLMMD',
    'DMMMMMMMMMMMMMMMMMMMMMMCMMMMMDD.....................DDDMLLLMMMMD',
    'DPPPPPPPPPPPPPPPMMMMMMCMMMMMMD.DDDDDD............DDDDLLCLCMMMMMD',
    '.PPWPPWPPWPPWPPPPPPPMMCMMMMMMDDDLLLLDDDDD.....DDDDLLLLCMMMMMMMDD',
    'DPPPPPPPPPPPPPPPWPPPPPPPMMMMDLLLLLLLLLLLDDDDDDDLLLLLLCCMMMMMMDD.',
    'DMMMMMMPPPPPPPPPPPPPWMMMMMMMLLLLLLLLLCLLLLLLLLLLLCLLMCMMMMMDDD..',
    'DMMMMWMMMMWMMMMMMMMMMMMMMLLMLLLLLLCLCLLLLCLCLLLLCCMMMMMMMMDD....',
    'MMMMMMMMMMMMMMMWMMMWMMMMMMMMLLCLLLLLCLLLLLCLLCLLCMMMMMMMDDD.....',
    'DDMMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLCLLLCLLCLLLLCMMMMMMMDD.......',
    '.DDDDDMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLCLCLLLLMMMMMDDD........',
    '.....DDDDDDDDDDDMMMMMMMMMMMMMLLLLLLLLLLLLCLLLLLCMMMDDD..........',
    '...............DMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD............',
    '...............DDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '................DDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMD.............',
    '..............DDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '..........DDDDDMMMMMMMMMMMMBBBBBBBBBBBBBBBBMMMMMMD..............',
    '..........DMMMMMMMMMMMMMMMBBBBBBBBBBBBBBBBBBMMMMMD..............',
    '..........DDDMMMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBMMMDD..............',
    '............DMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBBBBMDD...............',
    '...........DDMDDMDDDDBBBBBBBBBBBBBBBBBBBBBBBBBBDD...............',
    '...........DMDDDDD..DDBBBBBBBBBBBBBBBBBBBBMMMBBBDD..............',
    '...........DDD.......DDDBBBBBMMMMMMMBBBBBBMMMMMMMD..............',
    '.......................DDDBBBBMMMMMMBBBBBBMMMMMMMD..............',
    '.........................DDBBBMMMMMMMBBBBBMMMMMMMD..............',
    '..........................DDDDMMMMMMMBBBBBMMMMMMDD..............',
    '.............................DDMMMMMMDDDDDMMMMMMD...............',
    '..............................DMMMMMMMD..DMMMMMMD...............',
    '..............................DMMMMMMMDDDDMMMMMMD...............',
    '..............................DDMMMMMMMDDMMMMMMDD...............',
    '...............................DDMMMMMMMMMMMMMDD................',
    '................................DDDMMMMMMMMMMDD.................',
    '...........................DDDDDDDDDMMMMMMMMMDDDDDD.............',
    '...........................DMMMMMMMMMMMMMMMMMMMMMMD.............',
    '...........................DMRMMMMMMMMMMMMMMMMMMRMD.............',
  ],
  walk3: [
    '................................................................',
    '................................................................',
    '................................................................',
    '...........DDDDDDDDDDDD.........................................',
    '..DDDDDDDDDDMMMMMMMMMMDDD.......................................',
    '.DDMLLLLLLLLLLLLLLLMMMMMDD......................................',
    '.DMLLLLLLLLLLLLLLLLCLMMMMDDD....................................',
    'DDMLLLLLLLLLLLLLLLLLCLLMMMMDDD...............................DDD',
    'DMLLLLLLLLLLLLLLLEPLCLLLLMMMMDD............................DDDMD',
    'MMMMLLLLLLLLLLLLLLLLLCMMCMMMMMD.........................DDDDMMMD',
    'MMMMMPMLLLLLLLLLLLMMMCMCMMMMMMD.......................DDDMMLLMMD',
    'DMMMMMMMMMMMMMMMMMMMMMMCMMMMMDD.....................DDDMLLLMMMMD',
    'DPPPPPPPPPPPPPPPMMMMMMCMMMMMMD.DDDDDD............DDDDLLCLCMMMMMD',
    '.PPWPPWPPWPPWPPPPPPPMMCMMMMMMDDDLLLLDDDDD.....DDDDLLLLCMMMMMMMDD',
    'DPPPPPPPPPPPPPPPWPPPPPPPMMMMDLLLLLLLLLLLDDDDDDDLLLLLLCCMMMMMMDD.',
    'DMMMMMMPPPPPPPPPPPPPWMMMMMMMLLLLLLLLLCLLLLLLLLLLLCLLMCMMMMMDDD..',
    'DMMMMWMMMMWMMMMMMMMMMMMMMLLMLLLLLLCLCLLLLCLCLLLLCCMMMMMMMMDD....',
    'MMMMMMMMMMMMMMMWMMMWMMMMMMMMLLCLLLLLCLLLLLCLLCLLCMMMMMMMDDD.....',
    'DDMMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLCLLLCLLCLLLLCMMMMMMMDD.......',
    '.DDDDDMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLCLCLLLLMMMMMDDD........',
    '.....DDDDDDDDDDDMMMMMMMMMMMMMLLLLLLLLLLLLCLLLLLCMMMDDD..........',
    '...............DMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD............',
    '...............DDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '................DDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMD.............',
    '..............DDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '..........DDDDDMMMMMMMMMMMMBBBBBBBBBBBBBBBBMMMMMMD..............',
    '..........DMMMMMMMMMMMMMMMBBBBBBBBBBBBBBBBBBMMMMMD..............',
    '..........DDDMMMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBMMMDD..............',
    '............DMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBBBBMDD...............',
    '...........DDMDDMDDDDBBBBBBBBBBBBBBBBBBBBBBBBBBDD...............',
    '...........DMDDDDD..DDBBBBBBBBBBBBBBBBBBBBMMMBBBDD..............',
    '...........DDD.......DDDBBBBMMMMMMMBBBBBBBMMMMMMMD..............',
    '.......................DDDBBMMMMMMMBBBBBBBBMMMMMMD..............',
    '.........................DDBMMMMMMMBBBBBBBBMMMMMMD..............',
    '..........................DMMMMMMMMBBBBBBBBMMMMMMDD.............',
    '..........................DMMMMMMMDDDDDDDDDDMMMMMMD.............',
    '..........................DMMMMMMMD........DMMMMMMD.............',
    '.........................DDMMMMMMMD........DMMMMMMD.............',
    '........................DDMMMMMMMDD........DDMMMMMDD............',
    '.......................DDMMMMMMMDD..........DMMMMMMD............',
    '......................DDMMMMMMMDD...........DDMMMMMDD...........',
    '...........DDDDDDDDDDDDMMMMMMMDD.............DMMMMMMDDDDDDDDDDDD',
    '...........DMMMMMMMMMMMMMMMMMDD..............DDMMMMMMMMMMMMMMMMM',
    '...........DMRMMMMMMMMMMDDDDDD................DDDDDMMMMMMMMMMMRM',
  ],
  roar: [
    '................................................................',
    '................................................................',
    '............DDDDDDDDDDD.........................................',
    '...DDDDDDDDDDMMMMMMMMMDD........................................',
    '..DDMMMMMMMMMMMMMMMMMMMDDD......................................',
    '.DDMLLLLLLLLLLLLLLLMMMMMMDDD....................................',
    'DDMLLLLLLLLLLLLLLLLCLMMMMMMDD...................................',
    'DMMLLLLLLLLLLLLLLLLLCLLMMMMMDD...............................DDD',
    'MMLLLLLLLLLLLLLLLEPLCLLLLMMMMD.............................DDDMD',
    'DMMMLLLLLLLLLLLLLLLLLCMMCMMMMD..........................DDDDMMMD',
    'DMMMMPMLLLLLLLLLLLMMMCMCMMMMDD........................DDDMMLLMMD',
    'DDPPPPPPPMMMMMMMMMMMMMMCMMMMD.......................DDDMLLLMMMMD',
    '..PWPPPPPPPPPPPPPMMMMMCMMMMMD..DDDDDD............DDDDLLCLCMMMMMD',
    '.PPPPPWPPWPPPPPPPPPPMMCMMMMDDDDDLLLLDDDDD.....DDDDLLLLCMMMMMMMDD',
    '.PPPPPRRRRRPWPPWPPPPPPPDDDDDDLLLLLLLLLLLDDDDDDDLLLLLLCCMMMMMMDD.',
    'DDDDDDDRRRRRRRRRRRPWLLLLLDLLLLLLLLLLLCLLLLLLLLLLLCLLMCMMMMMDDD..',
    'DMMMMWPRRWRRRRRRRRRMMMMLLLLMLLLLLLCLCLLLLCLCLLLLCCMMMMMMMMDD....',
    'DMMPPPPPRRRRRWPPPWPPMMMMMMMMLLCLLLLLCLLLLLCLLCLLCMMMMMMMDDD.....',
    'DMMMMMPPPPPPPPPPPMMMMWMMMMMMMLLLLLLCLLLCLLCLLLLCMMMMMMMDD.......',
    'DMMMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLCLCLLLLMMMMMDDD........',
    'DDDMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLCLLLLLCMMMDDD..........',
    '..DDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD............',
    '.......DDDDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '................DDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMD.............',
    '..............DDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '..........DDDDDMMMMMMMMMMMMBBBBBBBBBBBBBBBBMMMMMMD..............',
    '..........DMMMMMMMMMMMMMMMBBBBBBBBBBBBBBBBBBMMMMMD..............',
    '..........DDDMMMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBMMMDD..............',
    '............DMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBBBBMDD...............',
    '...........DDMDDMDDDDBBBBBBBBBBBBBBBBBBBBBBBBBBDD...............',
    '...........DMDDDDD..DDBBBBBBBBBBBBBBBBBBBBMMMBBBDD..............',
    '...........DDD.......DDDBBBBBMMMMMMMBBBBBBMMMMMMMD..............',
    '.......................DDDBBBMMMMMMMBBBBBBBMMMMMMDD.............',
    '.........................DDBBMMMMMMMBBBBBBBMMMMMMMD.............',
    '..........................DDDMMMMMMMBBBBBBBMMMMMMMD.............',
    '............................DMMMMMMMDDDDDDDDMMMMMMDD............',
    '............................DMMMMMMMD......DMMMMMMMD............',
    '...........................DDMMMMMMMD......DDMMMMMMDD...........',
    '...........................DMMMMMMMMD.......DMMMMMMMDDD.........',
    '..........................DDMMMMMMMDD.......DDMMMMMMMMDDDD......',
    '..........................DMMMMMMMDD.........DDMMMMMMMMMMDDDDDDD',
    '................DDDDDDDDDDDMMMMMMDD...........DDDMMMMMMMMMMMMMMM',
    '................DMMMMMMMMMMMMMMMDD..............DDDDDDMMMMMMMMMR',
    '................DMRMMMMMMMMMMDDDD....................DMMMMMMMMMM',
  ],
  hurt: [
    '................................................................',
    '................................................................',
    '................................................................',
    '...........DDDDDDDDDDDD.........................................',
    '..DDDDDDDDDDMMMMMMMMMMDDD.......................................',
    '.DDMLLLLLLLLLLLLLLLMMMMMDD......................................',
    '.DMLLLLLLLLLLLLLLLLCLMMMMDDD....................................',
    'DDMLLLLLLLLLLLLLLLLLCLLMMMMDDD...............................DDD',
    'DMLLLLLLLLLLLLLLLEPLCLLLLMMMMDD............................DDDMD',
    'MMMMLLLLLLLLLLLLLLLLLCMMCMMMMMD.........................DDDDMMMD',
    'MMMMMPMLLLLLLLLLLLMMMCMCMMMMMMD.......................DDDMMLLMMD',
    'DMMMMMMMMMMMMMMMMMMMMMMCMMMMMDD.....................DDDMLLLMMMMD',
    'DPPPPPPPPPPPPPPPMMMMMMCMMMMMMD.DDDDDD............DDDDLLCLCMMMMMD',
    '.PPWPPWPPWPPWPPPPPPPMMCMMMMMMDDDLLLLDDDDD.....DDDDLLLLCMMMMMMMDD',
    'DPPPPPPPPPPPPPPPWPPPPPPPMMMMDLLLLLLLLLLLDDDDDDDLLLLLLCCMMMMMMDD.',
    'DMMMMMMPPPPPPPPPPPPPWMMMMMMMLLLLLLLLLCLLLLLLLLLLLCLLMCMMMMMDDD..',
    'DMMMMWMMMMWMMMMMMMMMMMMMMLLMLLLLLLCLCLLLLCLCLLLLCCMMMMMMMMDD....',
    'MMMMMMMMMMMMMMMWMMMWMMMMMMMMLLCLLLLLCLLLLLCLLCLLCMMMMMMMDDD.....',
    'DDMMMMMMMMMMMMMMMMMMMMMMXXMMMLLLLLLCLLLCLLCLLLLCMMMMMMMDD.......',
    '.DDDDDMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLCLCLLLLMMMMMDDD........',
    '.....DDDDDDDDDDDMMMMMMMMMMMMMLLLLLLLLLLLLCLLLLLCMMMDDD..........',
    '...............DMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD............',
    '...............DDMMMMMMMMMMMMMMMMXXMMMMMMMMMMMMMMDD.............',
    '................DDMMMMMMMMMMMMMMMMMXMMMMMMMMMMMMMMD.............',
    '..............DDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDD.............',
    '..........DDDDDMMMMMMMMMMMMBBBBBBBBBBBBBBBBMMMMMMD..............',
    '..........DMMMMMMMMMMMMMMMBBBBBBBBBBBBBBBBBBMMMMMD..............',
    '..........DDDMMMMMMMMMMMBBBBBBBBBBBBBBBBBBBBBMMMDD..............',
    '............DMMMMMMMMMBBBBBBBBBBBBBBBBBBBBXXBBMDD...............',
    '...........DDMDDMDDDDBBBBBBBBBBBBBBBBBBBBBBBBBBDD...............',
    '...........DMDDDDD..DDBBBBBBBBBBBBBBBBBBBBMMMBBBDD..............',
    '...........DDD.......DDDBBBBBMMMMMMMBBBBBBMMMMMMMD..............',
    '.......................DDDBBBBMMMMMMBBBBBBMMMMMMMD..............',
    '.........................DDBBBMMMMMMMBBBBBMMMMMMMD..............',
    '..........................DDDDMMMMMMMBBBBBMMMMMMDD..............',
    '.............................DDMMMMMMDDDDDMMMMMMD...............',
    '..............................DMMMMMMMD..DMMMMMMD...............',
    '..............................DMMMMMMMDDDDMMMMMXD...............',
    '..............................DDMMMMMMMDDMMMMMMDX...............',
    '...............................DDMMMMMMMMMMMMMDD................',
    '................................DDDMMMMMMMMMMDD.................',
    '...........................DDDDDDDDDMMMMMMMMMDDDDDD.............',
    '...........................DMMMMMMMMMMMMMMMMMMMMMMD.............',
    '...........................DMRMMMMMMMMMMMMMMMMMMRMD.............',
  ],
};

const TILE_PALETTE: Palette = {
  '.': 'transparent',
  G: '#4a7c3a', // grass - earthy jungle green
  g: '#3a5c2a',
  H: '#6ba35a', // grass highlight
  D: '#6b4a35', // dirt - warm earthy brown
  d: '#4a3525',
  M: '#8b6a4a',
  S: '#9a8a7a', // stone/spike - volcanic stone
  s: '#6a5a4a',
  K: '#baba9a',
  R: '#c45a3a', // spike accent - volcanic red
  r: '#8b3a2a',
  Y: '#d4a45a', // platform wood - aged jungle wood
  W: '#e8dcc8',
  P: '#b8a890',
  L: '#d4c4a8',
  B: '#2a1a0a',
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
  L: '#2a4a1a',
  l: '#3a6a2a',
  H: '#6a9a5a',
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
