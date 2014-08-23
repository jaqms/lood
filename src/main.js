
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
	game.physics.startSystem(Phaser.Physics.ARCADE);
	
	//Objects
	map = game.add.tilemap('level1');
	map.addTilesetImage('tileset', 'tileset', 32, 32);

	layer2 = map.createLayer('Level1-2');
	layer1 = map.createLayer('Level1-1');
	mainLayer = map.createBlankLayer("Main", STAGE_TILE_WIDTH, STAGE_TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
	var layer1Tiles = map.copy(0, 0, STAGE_TILE_WIDTH, STAGE_TILE_HEIGHT, layer1);
	map.paste(0, 0, layer1Tiles, mainLayer);
	map.setLayer(mainLayer);
	map.setCollisionBetween(2, 3);

	vectorLayer = game.add.graphics(0, 0);
	//vectorLayer.fixedToCamera = true;
	
	player = new Player();
	portal = new Portal(layer2);

	player.init();
	portal.init();

	//Physics
	game.physics.arcade.gravity.y = 250;

	game.camera.follow(player.obj);
}

function update() {
	game.physics.arcade.collide(player.obj, mainLayer);
	
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
	game.debug.bodyInfo(player.obj, 12, 36);
	game.debug.text(game.camera.x + ", " + game.camera.y, 12, 54);
}

//-------------------------------------------------------------------------------------------------------------------

function Portal (layer) {
	this.obj = new Phaser.Rectangle(0, 0, 320, 256);
	this.lastPos = new Phaser.Rectangle(0, 0, 320, 256);
	this.clickStartPos = new Phaser.Point(0, 0);

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
	this.state['dragging'] = false;
}

Portal.prototype.getTiles = function () {
	return tiles;
}

Portal.prototype.refreshTiles = function () {
	//this.tiles = this.layer.getTiles(game.camera.x + this.obj.x, game.camera.y + this.obj.y, this.obj.width - 32, this.obj.height - 32);

	//For smooth movement
	this.showTiles = this.layer.getTiles(this.obj.x, this.obj.y, this.obj.width - 32, this.obj.height - 32);
	this.hideTiles = layer1.getTiles(this.lastPos.x, this.lastPos.y, this.obj.width - 32, this.obj.height - 32);
	//var dirtyX = this.obj.x > this.lastPos.x ? new Phaser.Rectangle(this.lastPos.left, this.lastPos.top, this.obj.left - this.lastPos.left, this.lastPos.height) : new Phaser.Rectangle(this.obj.right, this.lastPos.top, this.obj.x - this.lastPos.x, this.lastPos.height);
	//var dirtyY = this.obj.y > this.lastPos.y ? new Phaser;
	//var dirtyXY;
}

Portal.prototype.update = function () {
	this.state['moved'] = false;

	if (game.input.mousePointer.isDown) {
		if (!this.state['dragging']) {
			this.state['dragging'] = true;
			this.clickStartPos.setTo(game.input.worldX, game.input.worldY);
		}
		
		var touchInside = Phaser.Rectangle.contains(this.obj, game.input.worldX, game.input.worldY);

		if (touchInside) {
			var dx = game.input.worldX - this.clickStartPos.x;
			var dy = game.input.worldY - this.clickStartPos.y;
			
			if (Math.abs(dx) >= 32) {
				if (dx >= 32)
					this.obj.x += game.math.snapTo(dx, 32);
				else
					this.obj.x += game.math.snapTo(dx, 32);
				this.state['moved'] = true;
			}
			if (Math.abs(dy) >= 32) {
				if (dy >= 32)
					this.obj.y += game.math.snapTo(dy, 32);
				else
					this.obj.y += game.math.snapTo(dy, 32);
				this.state['moved'] = true;
			}
		}
		else {
			var dx = game.input.worldX - this.lastPos.centerX;
			var dy = game.input.worldY - this.lastPos.centerY;
			
			if (Math.abs(dx) >= 32) {
				if (dx >= 32) {
					this.obj.centerX = game.input.worldX - (game.input.worldX % 32);
				}
				else {
					this.obj.centerX = game.input.worldX + 32 - (game.input.worldX % 32);
				}
				this.state['moved'] = true;
			}
			if (Math.abs(dy) >= 32) {
				if (dy >= 32) {
					this.obj.centerY = game.input.worldY - (game.input.worldY % 32);
				}
				else {
					this.obj.centerY = game.input.worldY + 32 - (game.input.worldY % 32);
				}
				this.state['moved'] = true;
			}
		}
	}
	else if (game.input.mousePointer.isUp) {
		this.state['dragging'] = false;
	}

	if (this.state['moved']) {
		this.state['dragging'] = false;
		this.refreshTiles();
	}
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
	this.obj.x = 608;
	this.obj.y = 1824;
	this.lastPos.x = this.obj.x;
	this.lastPos.y = this.obj.y;
	this.state['moved'] = false;

	game.physics.enable(this.obj, Phaser.Physics.ARCADE);
	this.obj.body.setSize(24, 32);
	this.obj.body.collideWithWorldBounds = true;
	this.obj.body.bounce.y = 0.2;
	this.obj.body.bounce.x = 0.0;
	this.obj.body.linearDamping = 1;
}

Player.prototype.update = function () {
	this.state['moved'] = false;

	this.obj.body.velocity.x = 0;

	if (game.input.keyboard.isDown(68)) {
		this.obj.body.velocity.x = 200;
		this.state['moved'] = true;
	}
	else if (game.input.keyboard.isDown(65)) {
		this.obj.body.velocity.x = -200;
		this.state['moved'] = true;
	}

	if (game.input.keyboard.isDown(87)) {
		if (this.obj.body.onFloor()) {
			this.obj.body.velocity.y = -200;
			this.state['moved'] = true;
		}
	}
}

Player.prototype.postUpdate = function () {
	if (this.state['moved']) {
		this.lastPos.x = this.obj.x;
		this.lastPos.y = this.obj.y;
	}
}