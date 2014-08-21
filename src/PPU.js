/**
 * Ricoh 2C02
 */
function PPU() {
  this.count = 0;
  this.scanLine = 0;
  this.cycle = 0;
  this.xScroll = 0;

  this.cpu = null;
  this.display = null;
  this.ctrl1 = new PPUControl1Register();
  this.ctrl2 = new PPUControl2Register();
  this.sr = new PPUStatusRegister( // Status Register
                  this._StatusRegisterReadCallback.bind(this),
                  null);
  this.sprAddr = new RegisterWithCallback(
                       null,
                       this._SPRRAMAddressWriteCallback.bind(this));
  this.sprIO = new RegisterWithCallback(
                     null,
                     this._SPRRAMIOWriteCallback.bind(this));
  this.vRAMAddr1 = new RegisterWithCallback(
                         null,
                         this._VRAMAddress1WriteCallback.bind(this));
  this.vRAMAddr2 = new RegisterWithCallback(
                         null,
                         this._VRAMAddress2WriteCallback.bind(this));
  this.vRAMIO = new RegisterWithCallback(
                      this._VRAMIOReadCallback.bind(this),
                      this._VRAMIOWriteCallback.bind(this));
  this.sprDMA = new RegisterWithCallback(
                      null,
                      this._SPRRAMDMAWriteCallback.bind(this));

  this.vram = new VRAM();
  this.sprram = new SPRRAM();

  // TODO: temporal
  this.sprites = [];
  this.sprites.length = 64;
  this.spritesMap = [];
  this.spritesMap.length = 256 * 240;

  this.ram = null;
  this.mem = null; // initialized by initMemoryController

  this.higherVRAMAddress = 0;
  this.VRAMAddressCount1 = 0;
  this.VRAMAddressCount2 = 0;
};

PPU._VBLANK_CYCLE = parseInt(341 * 262 / 3); // TODO: temporal

PPU._PALETTE = [];
PPU._PALETTE[0x00] = [0x75, 0x75, 0x75];
PPU._PALETTE[0x01] = [0x27, 0x1B, 0x8F];
PPU._PALETTE[0x02] = [0x00, 0x00, 0xAB];
PPU._PALETTE[0x03] = [0x47, 0x00, 0x9F];
PPU._PALETTE[0x04] = [0x8F, 0x00, 0x77];
PPU._PALETTE[0x05] = [0xAB, 0x00, 0x13];
PPU._PALETTE[0x06] = [0xA7, 0x00, 0x00];
PPU._PALETTE[0x07] = [0x7F, 0x0B, 0x00];
PPU._PALETTE[0x08] = [0x43, 0x2F, 0x00];
PPU._PALETTE[0x09] = [0x00, 0x47, 0x00];
PPU._PALETTE[0x0A] = [0x00, 0x51, 0x00];
PPU._PALETTE[0x0B] = [0x00, 0x3F, 0x17];
PPU._PALETTE[0x0C] = [0x1B, 0x3F, 0x5F];
PPU._PALETTE[0x0D] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x0E] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x0F] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x10] = [0xBC, 0xBC, 0xBC];
PPU._PALETTE[0x11] = [0x00, 0x73, 0xEF];
PPU._PALETTE[0x12] = [0x23, 0x3B, 0xEF];
PPU._PALETTE[0x13] = [0x83, 0x00, 0xF3];
PPU._PALETTE[0x14] = [0xBF, 0x00, 0xBF];
PPU._PALETTE[0x15] = [0xE7, 0x00, 0x5B];
PPU._PALETTE[0x16] = [0xDB, 0x2B, 0x00];
PPU._PALETTE[0x17] = [0xCB, 0x4F, 0x0F];
PPU._PALETTE[0x18] = [0x8B, 0x73, 0x00];
PPU._PALETTE[0x19] = [0x00, 0x97, 0x00];
PPU._PALETTE[0x1A] = [0x00, 0xAB, 0x00];
PPU._PALETTE[0x1B] = [0x00, 0x93, 0x3B];
PPU._PALETTE[0x1C] = [0x00, 0x83, 0x8B];
PPU._PALETTE[0x1D] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x1E] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x1F] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x20] = [0xFF, 0xFF, 0xFF];
PPU._PALETTE[0x21] = [0x3F, 0xBF, 0xFF];
PPU._PALETTE[0x22] = [0x5F, 0x97, 0xFF];
PPU._PALETTE[0x23] = [0xA7, 0x8B, 0xFD];
PPU._PALETTE[0x24] = [0xF7, 0x7B, 0xFF];
PPU._PALETTE[0x25] = [0xFF, 0x77, 0xB7];
PPU._PALETTE[0x26] = [0xFF, 0x77, 0x63];
PPU._PALETTE[0x27] = [0xFF, 0x9B, 0x3B];
PPU._PALETTE[0x28] = [0xF3, 0xBF, 0x3F];
PPU._PALETTE[0x29] = [0x83, 0xD3, 0x13];
PPU._PALETTE[0x2A] = [0x4F, 0xDF, 0x4B];
PPU._PALETTE[0x2B] = [0x58, 0xF8, 0x98];
PPU._PALETTE[0x2C] = [0x00, 0xEB, 0xDB];
PPU._PALETTE[0x2D] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x2E] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x2F] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x30] = [0xFF, 0xFF, 0xFF];
PPU._PALETTE[0x31] = [0xAB, 0xE7, 0xFF];
PPU._PALETTE[0x32] = [0xC7, 0xD7, 0xFF];
PPU._PALETTE[0x33] = [0xD7, 0xCB, 0xFF];
PPU._PALETTE[0x34] = [0xFF, 0xC7, 0xFF];
PPU._PALETTE[0x35] = [0xFF, 0xC7, 0xDB];
PPU._PALETTE[0x36] = [0xFF, 0xBF, 0xB3];
PPU._PALETTE[0x37] = [0xFF, 0xDB, 0xAB];
PPU._PALETTE[0x38] = [0xFF, 0xE7, 0xA3];
PPU._PALETTE[0x39] = [0xE3, 0xFF, 0xA3];
PPU._PALETTE[0x3A] = [0xAB, 0xF3, 0xBF];
PPU._PALETTE[0x3B] = [0xB3, 0xFF, 0xCF];
PPU._PALETTE[0x3C] = [0x9F, 0xFF, 0xF3];
PPU._PALETTE[0x3D] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x3E] = [0x00, 0x00, 0x00];
PPU._PALETTE[0x3F] = [0x00, 0x00, 0x00];


/**
 * TODO: make explicit setCPU method?
 */
PPU.prototype.initMemoryController = function(cpu) {
  this.cpu = cpu;
  this.ram = cpu.ram;
  this.mem = new PPUMemoryController(this);
  // TODO: temporal
  this.sr.store(0x80);
};


PPU.prototype.setROM = function(rom) {
  this.mem.setROM(rom);
};


PPU.prototype.setDisplay = function(display) {
  this.display = display;
};


PPU.prototype.load = function(address) {
  return this.mem.load(address);
};


PPU.prototype.store = function(address, value) {
  this.mem.store(address, value);
};


/**
 * TODO: not implemented yet.
 */
PPU.prototype.runCycle = function() {
  if(this.cycle == 1 && this.scanLine == 241) {
    this.setVBlank();
    this.display.update();
    if(this.ctrl1.isVBlank()) {
      this.cpu.interrupt(CPU._INTERRUPT_NMI);
    }
  }

  if(this.cycle == 1 && this.scanLine == 261) {
    this.clearVBlank();
  }

  this.cycle++;
  if(this.cycle > 340) {
    this.cycle = 0;
    this.scanLine++;
    if(this.scanLine > 261) {
      this.scanLine = 0;
    }
  }
};


PPU.prototype._VRAMAddress1WriteCallback = function() {
  if(this.VRAMAddressCount1 == 0) {
    this.xScroll = this.vRAMAddr1.load(true);
    this.VRAMAddressCount1 = 1;
  } else {
    this.VRAMAddressCount1 = 0;
  }
};


PPU.prototype._VRAMAddress2WriteCallback = function() {
  if(this.VRAMAddressCount2 == 0) {
    this.higherVRAMAddress = this.vRAMAddr2.load(true);
    this.VRAMAddressCount2 = 1;
  } else {
    this.VRAMAddressCount2 = 0;
  }
};


PPU.prototype._getVRAMAddress = function() {
  return (this.higherVRAMAddress << 8) | this.vRAMAddr2.load(true);
};


/**
 * TODO: check the logic.
 */
PPU.prototype._incrementVRAMAddress = function() {
  var plus = this.ctrl1.isIncrementAddressSet() ? 32 : 1;
  var addr = this._getVRAMAddress() + plus;
  this.higherVRAMAddress = (addr >> 8) & 0xff;
  this.vRAMAddr2.store(addr & 0xff, true);
};


PPU.prototype._VRAMIOReadCallback = function() {
  this.vRAMIO.store(this.mem.load(this._getVRAMAddress()), true);
  this.VRAMAddressCount2 = 0;
  this._incrementVRAMAddress();
};


PPU.prototype._VRAMIOWriteCallback = function() {
  this.mem.store(this._getVRAMAddress(), this.vRAMIO.load(true));
  this.VRAMAddressCount2 = 0;
  this._incrementVRAMAddress();
};


/**
 * TODO: temporal
 */
PPU.prototype._StatusRegisterReadCallback = function() {
//  this.sr.store(this.sr.load(true) & 0x7f, true);
};


PPU.prototype._SPRRAMAddressWriteCallback = function() {

};


PPU.prototype._SPRRAMIOWriteCallback = function() {
  var addr = this.sprAddr.load(true);
  var value = this.sprIO.load(true);
  this.sprram.store(addr, value);
};


PPU.prototype._SPRRAMDMAWriteCallback = function() {
  var addr = this.sprDMA.load(true) * 0x100;
  for(var i = 0; i < 256; i++) {
    var value = this.ram.load(addr + i);
    this.sprram.store(i, value);
  }
};


/**
 * TODO: temporal
 */
PPU.prototype.setVBlank = function() {
  this.sr.store(this.sr.load(true) | 0x80, true);
};


/**
 * TODO: temporal
 */
PPU.prototype.clearVBlank = function() {
  this.sr.store(this.sr.load(true) & 0x7f, true);
};


/**
 * TODO: temporal
 */
PPU.prototype.initSprites = function() {
  this.spritesMap.length = 0;
  this.spritesMap.length = 256*240;

  for(var i = 0; i < 64; i++) {
    var b0 = this.sprram.load(i*4+0);
    var b1 = this.sprram.load(i*4+1);
    var b2 = this.sprram.load(i*4+2);
    var b3 = this.sprram.load(i*4+3);
    var s = new Sprite(b0, b1, b2, b3);
    if(!s.doDisplay() || s.getPriority())
      continue;

    this.sprites[i] = s;
    var bx = s.getXPosition();
    var by = s.getYPosition();
    for(var j = 0; j < 8; j++) {
      for(var k = 0; k < 8; k++) {
        var cx = s.doFlipHorizontally() ? 7-k : k;
        var cy = s.doFlipVertically() ? 7-j : j;
        var x = bx + k;
        var y = by + j;
        if(x >= 256 || y >= 240)
          continue
        var si = y*256 + x;
        var ptIndex = s.getTileIndex();
        var lsb = this._getPatternTableElement(ptIndex, cx, cy, true);
        if(lsb != 0) {
          var msb = s.getPalletNum();
          var pIndex = (msb << 2) | lsb;
          var c = PPU._PALETTE[this._getSpritePaletteIndex(pIndex)];
          this.spritesMap[si] = c;
        }
      }
    }
  }

};


/**
 * TODO: temporal
 */
PPU.prototype.getPixelRGB = function(x, y) {
/*
  var c = this._getSpritePixelRGB(x, y);
  if(c)
    return c;
*/
  var si = y*256 + x;
  if(this.spritesMap[si])
    return this.spritesMap[si];
  return this._getBackgroundPixelRGB(x, y);
};


/**
 * TODO: temporal. too bad and too slow. can cause heavy GC.
 */
PPU.prototype._getSpritePixelRGB = function(x, y) {
  for(var i = 0; i < 64; i++) {
    var b0 = this.sprram.load(i*4+0);
    var b1 = this.sprram.load(i*4+1);
    var b2 = this.sprram.load(i*4+2);
    var b3 = this.sprram.load(i*4+3);
    var s = new Sprite(b0, b1, b2, b3);
    if(x >= s.getXPosition() && x < s.getXPosition() + 8 &&
       y >= s.getYPosition() && y < s.getYPosition() + 8) {
      var ptIndex = s.getTileIndex();
      var lsb = this._getPatternTableElement(ptIndex, x, y, true);
      var msb = s.getPalletNum();
      var pIndex = (msb << 2) | lsb;
      return PPU._PALETTE[this._getPaletteIndex(pIndex)];
    }
  }
  return null;
};


/**
 * TODO: temporal
 */
PPU.prototype._getBackgroundPixelRGB = function(x, y) {
  x += this.xScroll;
  var msb = this._getAttributeTableEntry(x, y);
  var ptIndex = this._getNameTableEntry(x, y);
  var lsb = this._getPatternTableElement(ptIndex, x, y, false);
  var pIndex = (msb << 2) | lsb;
  return PPU._PALETTE[this._getPaletteIndex(pIndex)];
};


/**
 * TODO: temporal
 */
PPU.prototype._getAttributeTableEntry = function(x, y) {
  var ax = parseInt((x%256)/32);
  var ay = parseInt(y/32);
  var index = ay * 8 + ax;
  var topbottom = (y % 32) > 15 ? 1 : 0; // bottom, top
  var rightleft = (x % 32) > 15 ? 1 : 0; // right, left
  var position = (topbottom << 1) | rightleft; // bottomright, bottomleft,
                                               // topright, topleft
  var b = this.load(this._getNameTableAddress(x) + 0x3C0 + index);
  return (b >> (position * 2)) & 0x3;
};


/**
 * TODO: temporal
 */
PPU.prototype._getNameTableEntry = function(x, y) {
  var ax = parseInt((x%256) / 8);
  var ay = parseInt(y / 8);
  var index = ay * 32 + ax;

  return this.load(this._getNameTableAddress(x) + index);
};


PPU.prototype._getNameTableAddress = function(x) {
  switch(this.ctrl1.getNameTableAddress()) {
    case 0:
      return x < 256 ? 0x2000 : 0x2400;
    case 1:
      return x < 256 ? 0x2400 : 0x2000;
    case 2:
      return x < 256 ? 0x2800 : 0x2C00;
    default:
      return x < 256 ? 0x2C00 : 0x2800;
  }
};


/**
 * TODO: temporal
 */
PPU.prototype._getPatternTableElement = function(index, x, y, isSprite) {
  var ax = x % 8;
  var ay = y % 8;
  var tableNum = isSprite
                   ? (this.ctrl1.getSpritesPatternTableNum() ? 1 : 0)
                   : (this.ctrl1.getBackgroundPatternTableNum() ? 1 : 0);
  var offset = tableNum * 0x1000;
  var a = this.load(offset + index * 0x10 + ay);
  var b = this.load(offset + index * 0x10 + 0x8 + ay);
  return ((a >> (7-ax)) & 1) |
           (((b >> (7-ax)) & 1) << 1);
};


/**
 * TODO: temporal
 */
PPU.prototype._getPaletteIndex = function(index) {
  return this.load(0x3F00 + index);
};


/**
 * TODO: temporal
 */
PPU.prototype._getSpritePaletteIndex = function(index) {
  return this.load(0x3F10 + index);
};


PPU.prototype.dump = function() {
  var buffer = '';

  buffer += 'ctrl1: ' + this.ctrl1.dump() + '\n';
  buffer += 'ctrl2: ' + this.ctrl2.dump() + '\n';
  buffer += 'status: ' + this.sr.dump() + '\n';
  buffer += 'SPR addr: ' + this.sprAddr.dump() + '\n';
  buffer += 'SPR IO: ' + this.sprIO.dump() + '\n';
  buffer += 'VRAM ADDR1: ' + this.vRAMAddr1.dump() + '\n';
  buffer += 'VRAM ADDR2: ' + this.vRAMAddr2.dump() + '\n';
  buffer += 'VRAM IO: ' + this.vRAMIO.dump() + '\n';
  buffer += 'SRP DMA: ' + this.sprDMA.dump() + '\n';
  buffer += '\n';

  return buffer;
};


/**
 * TODO: duplicated code.
 */
PPU.prototype.dumpVRAM = function() {
  var buffer = '';
  var previousIsZeroLine = false;
  var offset = 0;
  var end = 0x10000;

  for(var i = offset; i < end; i++) {
    if(i % 0x10 == 0) {
      if(previousIsZeroLine) {
        var skipZero = false;
        while(this._checkNext16BytesIsZero(i+0x10)) {
          i += 0x10;
          skipZero = true;
        }
        if(skipZero)
          buffer += '...\n';
      }
      buffer += __10to16(i-offset, 4) + ' ';
      previousIsZeroLine = true;
    }

    var value = this.load(i);
    buffer += __10to16(value, 2, true) + ' ';
    if(value != 0)
      previousIsZeroLine = false;

    if(i % 0x10 == 0xf)
      buffer += '\n';
  }
  return buffer;
};


/**
 * TODO: bad performance.
 * TODO: check the logic.
 */
PPU.prototype._checkNext16BytesIsZero = function(offset) {
  if(offset + 0x10 >= 0x10000)
    return false;

  var sum = 0;
  for(var i = offset; i < offset + 0x10; i++) {
    sum += this.load(i);
  }
  return sum == 0;
};


PPU.prototype.dumpSPRRAM = function() {
  return this.sprram.dump();
};



function PPUMemoryController(ppu) {
  this.parent = ProcessorMemoryController;
  this.parent.call(this);
  this.vram = ppu.vram;
};
__inherit(PPUMemoryController, ProcessorMemoryController);

PPUMemoryController._CONTAINER = {'target': null, 'addr': null};


PPUMemoryController.prototype._map = function(address) {
  var target = null;
  var addr = null;

  // TODO: temporal. for NROM.
  if(address < 0x2000 && this.rom.hasCHRROM()) {
    target = this.rom.chrrom;
    addr = address;
  } else {
    target = this.vram;
    addr = address;
    if(addr >= 0x4000) {
      addr = addr & 0x3FFF;
    }
    if(addr >= 0x3F00 && addr < 0x4000) {
      addr = addr & 0x3F1F;
    }
    if(addr >= 0x2000 && addr < 0x3F00) {
      addr = addr & 0x2FFF;
    }
  }

  var result = PPUMemoryController._CONTAINER;
  result.target = target;
  result.addr = addr;
  return result;
};



function PPUControl1Register() {
  this.parent = Register;
  this.parent.call(this);
};
__inherit(PPUControl1Register, Register);

PPUControl1Register._NMI_VBLANK_BIT = 7;
PPUControl1Register._MASTER_SLAVE_BIT = 6;
PPUControl1Register._SPRITES_SIZE_BIT = 5;
PPUControl1Register._BACKGROUND_PATTERN_TABLE_BIT = 4;
PPUControl1Register._SPRITES_PATTERN_TABLE_BIT = 3;
PPUControl1Register._INCREMENT_ADDRESS_BIT = 2;

PPUControl1Register._NAME_TABLE_ADDRESS_BIT = 0;
PPUControl1Register._NAME_TABLE_ADDRESS_BITS_MASK = 0x3;


PPUControl1Register.prototype.isIncrementAddressSet = function() {
  return this.loadBit(PPUControl1Register._INCREMENT_ADDRESS_BIT);
};


PPUControl1Register.prototype.isVBlank = function() {
  return this.loadBit(PPUControl1Register._NMI_VBLANK_BIT);
};


PPUControl1Register.prototype.setVBlank = function() {
  this.storeBit(PPUControl1Register._NMI_VBLANK_BIT, 1);
};


PPUControl1Register.prototype.clearVBlank = function() {
  this.storeBit(PPUControl1Register._NMI_VBLANK_BIT, 0);
};


PPUControl1Register.prototype.getBackgroundPatternTableNum = function() {
  return this.loadBit(PPUControl1Register._BACKGROUND_PATTERN_TABLE_BIT);
};


PPUControl1Register.prototype.getSpritesPatternTableNum = function() {
  return this.loadBit(PPUControl1Register._SPRITES_PATTERN_TABLE_BIT);
};


PPUControl1Register.prototype.getNameTableAddress = function() {
  return this.loadPartialBits(
           PPUControl1Register._NAME_TABLE_ADDRESS_BIT,
           PPUControl1Register._NAME_TABLE_ADDRESS_BITS_MASK);
};



function PPUControl2Register() {
  this.parent = Register;
  this.parent.call(this);
};
__inherit(PPUControl2Register, Register);

PPUControl2Register._BACKGROUND_COLOR_MODE_BIT = 5;
PPUControl2Register._BACKGROUND_COLOR_MODE_BITS_MASK = 0x7;

PPUControl2Register._SPRITES_DISPLAY_BIT = 4;
PPUControl2Register._BACKGROUND_DISPLAY_BIT = 3;
PPUControl2Register._CLIP_SPRITES_BIT = 2;
PPUControl2Register._CLIP_BACKGROUND_BIT = 1;
PPUControl2Register._COLOR_MODE_BIT = 0;



function PPUStatusRegister(readCallback, writeCallback) {
  this.parent = RegisterWithCallback;
  this.parent.call(this, readCallback, writeCallback);
};
__inherit(PPUStatusRegister, RegisterWithCallback);

PPUStatusRegister._VBLANK_BIT_BIT = 7;
PPUStatusRegister._SPRITE_ZERO_HIT_BIT = 6;
PPUStatusRegister._SCANLINE_SPRITE_COUNT_BIT = 5;
PPUStatusRegister._IGNORE_VRAM_WRITE_BIT = 4;



function Sprite(byte0, byte1, byte2, byte3) {
  this.byte0 = byte0;
  this.byte1 = byte1;
  this.byte2 = byte2;
  this.byte3 = byte3;
};


Sprite.prototype.doDisplay = function() {
  return this.byte0 < 0xEF;
};


Sprite.prototype.getYPosition = function() {
  return this.byte0 - 1;
};


Sprite.prototype.getXPosition = function() {
  return this.byte3;
};


Sprite.prototype.getTileIndex = function() {
  return this.byte1;
};


Sprite.prototype.getPalletNum = function() {
  return this.byte2 & 0x3;
};


Sprite.prototype.getPriority = function() {
  return (this.byte2 >> 5) & 1;
};


Sprite.prototype.doFlipHorizontally = function() {
  return ((this.byte2 >> 6) & 1) ? true : false;
};


Sprite.prototype.doFlipVertically = function() {
  return ((this.byte2 >> 7) & 1) ? true : false;
};

