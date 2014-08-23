
var game = new Phaser.Game(800, 640, Phaser.CANVAS, 'game', { preload: preload, create: create, update: update, render: render });

function preload() {
	game.load.tilemap('level1', 'assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tileset', 'assets/tileset.png');
    game.load.image('player', 'assets/player.png');
}

var STAGE_WIDTH = 2048;
var STAGE_HEIGHT = 2048;
var STAGE_TILE_WIDTH = 64;
var STAGE_TILE_HEIGHT = 64;
var TILE_WIDTH = 32;
var TILE_HEIGHT = 32;

var map;
var mainLayer;
var layer1;
var layer2;
var vectorLayer;
var player;
var portal;
var cursorKeys;

var events = {
	PORTAL_MOVED: new Phaser.Signal()
};

function create() {
	game.world.setBounds(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
	
	//Objects
	map = game.add.tilemap('level1');
	map.addTilesetImage('tileset', 'tileset', 32, 32);

	layer2 = map.createLayer('Level1-2');
	layer1 = map.createLayer('Level1-1');
	mainLayer = map.createBlankLayer("Main", STAGE_TILE_WIDTH, STAGE_TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);

	var layer1Tiles = map.copy(0, 0, STAGE_TILE_WIDTH, STAGE_TILE_HEIGHT, layer1);
	map.paste(0, 0, layer1Tiles, mainLayer);
	map.setLayer(mainLayer);

	vectorLayer = game.add.graphics(0, 0);
	vectorLayer.fixedToCamera = true;
	
	player = new Player();
	portal = new Portal(layer2);

	player.init();
	portal.init();

	game.camera.follow(player.obj);
}

function update() {
	//Update
	player.update();
	portal.update();

	//Post update
	player.postUpdate();
	portal.postUpdate();

	if (portal.state['moved'])
		putPortalTiles();
}

function putPortalTiles() {
	for (var i = 0; i < portal.hideTiles.length; i++) {
		var layer1Tile = map.getTile(portal.hideTiles[i].x, portal.hideTiles[i].y, layer1);
		if (map.getTile(portal.hideTiles[i].x, portal.hideTiles[i].y, mainLayer).index !== layer1Tile.index)
			map.putTile(layer1Tile, layer1Tile.x, layer1Tile.y, mainLayer, false, true);
	}

	for (var i = 0; i < portal.showTiles.length; i++) {
		if (map.getTile(portal.showTiles[i].x, portal.showTiles[i].y, mainLayer).index !== portal.showTiles[i].index)
			map.putTile(portal.showTiles[i], portal.showTiles[i].x, portal.showTiles[i].y, mainLayer, false, true);
	}
}

function render() {
	vectorLayer.clear();
	portal.draw(vectorLayer);

	//game.debug.pointer(game.input.activePointer);
	//game.debug.geom(portal.obj, '#ff00ff');
	//game.debug.geom(portal.lastPos, '#00ff00');
	game.debug.text((portal.obj.x) + ", " + (portal.obj.y) + " - " + (portal.lastPos.x) + ", " + (portal.lastPos.y), 12, 12);
	game.debug.text(portal.obj.centerX + ", " + portal.obj.centerY, 12, 36);
	game.debug.text(game.camera.x + ", " + game.camera.y, 12, 54);
}

//-------------------------------------------------------------------------------------------------------------------

function Portal (layer) {
	this.obj = new Phaser.Rectangle(0, 0, 320, 256);
	this.lastPos = new Phaser.Rectangle(0, 0, 320, 256);

	this.layer = layer;
	this.showTiles = [];
	this.hideTiles = [];
	this.state = {};
}

Portal.prototype.init = function () {
	this.obj.x = 0;
	this.obj.y = 0;
	this.lastPos.x = this.obj.x;
	this.lastPos.y = this.obj.y;

	this.state['moved'] = false;
}

Portal.prototype.getTiles = function () {
	return tiles;
}

Portal.prototype.refreshTiles = function () {
	//this.tiles = this.layer.getTiles(game.camera.x + this.obj.x, game.camera.y + this.obj.y, this.obj.width - 32, this.obj.height - 32);

	//For smooth movement
	this.showTiles = this.layer.getTiles(game.camera.x + this.obj.x, game.camera.y + this.obj.y, this.obj.width, this.obj.height);
	this.hideTiles = layer1.getTiles(game.camera.x + this.lastPos.x, game.camera.y + this.lastPos.y, this.obj.width, this.obj.height);
	//var dirtyX = this.obj.x > this.lastPos.x ? new Phaser.Rectangle(this.lastPos.left, this.lastPos.top, this.obj.left - this.lastPos.left, this.lastPos.height) : new Phaser.Rectangle(this.obj.right, this.lastPos.top, this.obj.x - this.lastPos.x, this.lastPos.height);
	//var dirtyY = this.obj.y > this.lastPos.y ? new Phaser;
	//var dirtyXY;
}

Portal.prototype.update = function () {
	this.state['moved'] = false;

	var dx = game.input.x - this.lastPos.centerX;
	var dy = game.input.y - this.lastPos.centerY;
	
	//Mouse move
	if (Math.abs(dx) >= 32) {
		if (dx >= 32)
			this.obj.centerX = game.input.x - (game.input.x % 32);
		else
			this.obj.centerX = game.input.x + 32 - (game.input.x % 32);
		this.state['moved'] = true;
	}
	if (Math.abs(dy) >= 32) {
		if (dy >= 32)
			this.obj.centerY = game.input.y - (game.input.y % 32);
		else
			this.obj.centerY = game.input.y + 32 - (game.input.y % 32);
		this.state['moved'] = true;
	}

	if (this.state['moved']) {
		this.refreshTiles();
	}
	//this.obj.centerX = game.input.x;
	//this.obj.centerY = game.input.y;

	//Camera move
	/*var worldDx = game.camera.x + this.obj.x - this.lastWorldPos.x;
	var worldDy = game.camera.y + this.obj.y - this.lastWorldPos.y;
	if (Math.abs(worldDx) > 32 || Math.abs(worldDy) > 32) {
		this.obj.centerX = worldDx > 32 ? this.obj.centerX - (this.obj.centerX % 32) : this.obj.centerX + 32 - (this.obj.centerX % 32);
		this.obj.centerY = worldDy > 32 ? this.obj.centerY - (this.obj.centerY % 32) : this.obj.centerY + 32 - (this.obj.centerY % 32);
		this.state['moved'] = true;
	}*/

	/*var cameraDx = game.camera.x - (this.lastWorldPos.x - this.obj.x);
	var cameraDy = game.camera.y - (this.lastWorldPos.y - this.obj.y);

	if (Math.abs(cameraDx) > 32) {
		if (cameraDx >= 32)
			this.obj.x = this.obj.x - (this.obj.x % 32);
		else
			this.obj.x = this.obj.x + 32 - (this.obj.x % 32);

		this.state['moved'] = true;
	}

	if (game.camera.y + this.obj.y % 32 !== 0) {
		if (this.obj.y % 32 <= 16)
			this.obj.y = this.obj.y - (this.obj.y % 32);
		else
			this.obj.y = this.obj.y + 32 - (this.obj.y % 32);

		this.state['moved'] = true;
	}*/
}

Portal.prototype.postUpdate = function () {
	if (this.state['moved']) {
		this.lastPos.x = this.obj.x;
		this.lastPos.y = this.obj.y;
	}
}

Portal.prototype.draw = function (graphics) {
	graphics.lineStyle(2, 0xff0000, 1.0);
	graphics.beginFill(0xff0000, 0.25);
	graphics.drawRect(this.obj.left, this.obj.top, this.obj.width, this.obj.height);
	graphics.endFill();
}

//-------------------------------------------------------------------------------------------------------------------

function Player () {
	this.obj = game.add.sprite(24, 32, 'player');
	this.lastPos = new Phaser.Point(0, 0);
	this.state = {};
}

Player.prototype.init = function () {
	this.obj.x = 64;
	this.obj.y = 1888;
	this.lastPos.x = this.obj.x;
	this.lastPos.y = this.obj.y;
	this.state['moved'] = false;
}

Player.prototype.update = function () {
	this.state['moved'] = false;

	if (game.input.keyboard.isDown(68)) {
		this.obj.x += 8;
		this.state['moved'] = true;
	}
	else if (game.input.keyboard.isDown(65)) {
		this.obj.x -= 8;
		this.state['moved'] = true;
	}
}

Player.prototype.postUpdate = function () {
	if (this.state['moved']) {
		this.lastPos.x = this.obj.x;
		this.lastPos.y = this.obj.y;
	}
}