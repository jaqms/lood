
var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'game', { preload: preload, create: create, update: update, render: render });

function preload() {
	game.load.tilemap('level1', 'assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('tileset', 'assets/tileset.png');
    game.load.image('player', 'assets/player.png');
}

var STAGE_WIDTH = 2048;
var STAGE_HEIGHT = 2048;

var map;
var layer1;
var layer2;
var player;
var vectorLayer;
var cursorKeys;

function create() {
	game.world.setBounds(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
	
	//Objects
	map = game.add.tilemap('level1');
	map.addTilesetImage('tileset', 'tileset', 32, 32);

	layer2 = map.createLayer('Level1-2');
	layer1 = map.createLayer('Level1-1');

	vectorLayer = game.add.graphics(0, 0);
	vectorLayer.fixedToCamera = true;
	
	portal = new Phaser.Rectangle(0, 0, 320, 240);

	player = game.add.sprite(24, 32, 'player');
	player.x = 64;
	player.y = 1888;

	game.camera.follow(player);

	//Input
	cursorKeys = game.input.keyboard.createCursorKeys();
}

function update() {
	if (cursorKeys.right.isDown) {
		player.x += 8;
	}
	else if (cursorKeys.left.isDown) {
		player.x -= 8;
	}

	if (Math.abs(game.input.x - portal.centerX) > 32) {
		portal.centerX = game.input.x;
	}
	if (Math.abs(game.input.y - portal.centerY) > 32) {
		portal.centerY = game.input.y;
	}

	getPortalTiles();
}

function getPortalTiles() {
	var portalTiles = layer2.getTiles(game.camera.x + portal.x, game.camera.y + portal.y - 16, portal.width, portal.height);
	for (var i = 0; i < portalTiles.length; i++) {
		map.putTile(portalTiles[i], portalTiles[i].x, portalTiles[i].y, layer1, false, true);
	}
}

function drawPortal() {
	vectorLayer.lineStyle(2, 0xff0000, 1.0);
	vectorLayer.beginFill(0xff0000, 0.5);
	vectorLayer.drawRect(portal.left, portal.top, portal.width, portal.height);
	vectorLayer.endFill();
}

function render() {
	vectorLayer.clear();
	drawPortal();

	//game.debug.pointer(game.input.activePointer);
	//game.debug.geom(portal, '#ff00ff');
}