
var game = new Phaser.Game(800, 640, Phaser.CANVAS, 'game', { preload: preload, create: create, update: update, render: render });

function preload() {
	game.load.tilemap('level1', 'assets/level1.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.spritesheet('spritesheet', 'assets/spritesheet.png', 32, 32);
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
var levelManager;
var vectorLayer;
var player;
var portal;
var ladders;
var platforms;
var spikes;
var hooks;

var events = {
	PORTAL_MOVED: new Phaser.Signal()
};

function create() {
	game.world.setBounds(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
	game.physics.startSystem(Phaser.Physics.ARCADE);
	
	map = game.add.tilemap();

	ladders = game.add.group();
	platforms = game.add.group();
	spikes = game.add.group();
	hooks = game.add.group();
	
	//Objects
	levelManager = new LevelManager();
	levelManager.loadLevel('level1', 'Level1-1', 'Level1-2', 'Objects1-1', 'Objects1-2')
	
	vectorLayer = game.add.graphics(0, 0);

	player = new Player();
	portal = new Portal();

	game.world.bringToTop(ladders);
	game.world.bringToTop(platforms);
	game.world.bringToTop(spikes);
	game.world.bringToTop(hooks);
	game.world.bringToTop(player);
	game.world.bringToTop(portal);

	player.init();
	portal.init(levelManager.bgLayer, levelManager.fgLayer);

	//Physics
	game.physics.arcade.gravity.y = 400;

	game.camera.follow(player.obj);
}

function update() {
	handleInteraction();
	
	//Update
	levelManager.updateObjects();
	player.update();
	portal.update();

	//Post update
	levelManager.postUpdateObjects();
	player.postUpdate();
	portal.postUpdate();

	if (portal.state['moved'])
		putPortalTiles();
}

function handleInteraction() {
	game.physics.arcade.collide(player.obj, levelManager.mainLayer);
	game.physics.arcade.collide(player.obj, platforms, function (player, platform) {
		player.body.velocity.x += platform.body.velocity.x;
	});
}

function putPortalTiles() {
	var fgLayerTile;
	var bgLayerTile;
	
	for (var i = 0; i < portal.hideTiles.length; i++) {
		fgLayerTile = map.getTile(portal.hideTiles[i].x, portal.hideTiles[i].y, levelManager.fgLayer);
		if (map.getTile(portal.hideTiles[i].x, portal.hideTiles[i].y, levelManager.mainLayer).index !== fgLayerTile.index)
			map.putTile(fgLayerTile, fgLayerTile.x, fgLayerTile.y, levelManager.mainLayer, false, true);
	}

	for (var i = 0; i < portal.showTiles.length; i++) {
		bgLayerTile = map.getTile(portal.showTiles[i].x, portal.showTiles[i].y, levelManager.bgLayer);
		if (map.getTile(portal.showTiles[i].x, portal.showTiles[i].y, levelManager.mainLayer).index !== bgLayerTile.index)
			map.putTile(bgLayerTile, bgLayerTile.x, bgLayerTile.y, levelManager.mainLayer, false, true);
	}
}

function render() {
	if (portal.state['moved']) {
		vectorLayer.clear();
		portal.draw(vectorLayer);
	}

	//game.debug.pointer(game.input.activePointer);
	//game.debug.geom(portal.obj, '#ff00ff');
	//game.debug.geom(portal.lastPos, '#00ff00');
	//game.debug.text((portal.obj.x) + ", " + (portal.obj.y) + " - " + (portal.lastPos.x) + ", " + (portal.lastPos.y), 12, 12);
	//game.debug.bodyInfo(player.obj, 12, 36);
	//game.debug.text(game.camera.x + ", " + game.camera.y, 12, 54);
}

//-------------------------------------------------------------------------------------------------------------------

function LevelManager() {
	this.mainLayer = null;
	this.fgLayer = null;
	this.bgLayer = null;
	this.fgObjects = [];
	this.bgObjects = [];
}

LevelManager.prototype.loadLevel = function (asset, fgLayerName, bgLayerName, fgObjectsName, bgObjectsName) {
	map.removeAllLayers();
	map = game.add.tilemap(asset);
	map.addTilesetImage('tileset', 'tileset', TILE_WIDTH, TILE_HEIGHT);
	this.fgLayer = map.createLayer(fgLayerName);
	this.bgLayer = map.createLayer(bgLayerName);
	this.mainLayer = map.createBlankLayer("Main", STAGE_TILE_WIDTH, STAGE_TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
	var fgLayerTiles = map.copy(0, 0, STAGE_TILE_WIDTH, STAGE_TILE_HEIGHT, this.fgLayer);
	map.paste(0, 0, fgLayerTiles, this.mainLayer);
	map.setLayer(this.mainLayer);
	map.setCollisionBetween(2, 3);

	this.fgObjects = this.loadObjects(map.objects[fgObjectsName], this.fgLayer);
	this.bgObjects = this.loadObjects(map.objects[bgObjectsName], this.bgLayer);
}

LevelManager.prototype.loadObjects = function (json, layer) {
	var objects = [];
	for (var i = 0; i < json.length; i++) {
		var object;
		switch (json[i].name) {
			case "ladder":
				object = new Ladder(json[i].height / TILE_HEIGHT, layer);
				object.init(json[i].x / TILE_WIDTH, json[i].y / TILE_HEIGHT);
				break;
			case "platform":
				object = new Platform(parseInt(json[i].properties.length), layer);
				object.init(json[i].x / TILE_WIDTH, json[i].y / TILE_HEIGHT, json[i].width / TILE_WIDTH, parseInt(json[i].properties.start), json[i].properties.direction, parseInt(json[i].properties.speed));
				break;
			case "spikes":
				object = new Spikes(json[i].width / TILE_WIDTH, layer);
				object.init(json[i].x / TILE_WIDTH, json[i].y / TILE_HEIGHT);
				break;
			case "hook":
				object = new Hook(layer);
				object.init(json[i].x / TILE_WIDTH, json[i].y / TILE_HEIGHT, json[i].properties.key);
				break;
		}

		if (object) {
			objects.push(object);
		}
	}

	return objects;
}

LevelManager.prototype.updateObjects = function () {
	for (var i = 0; i < this.fgObjects.length; i++) {
		this.fgObjects[i].update();
	}

	for (var i = 0; i < this.bgObjects.length; i++) {
		this.bgObjects[i].update();
	}
}

LevelManager.prototype.postUpdateObjects = function () {
	for (var i = 0; i < this.fgObjects.length; i++) {
		this.fgObjects[i].postUpdate();
	}

	for (var i = 0; i < this.bgObjects.length; i++) {
		this.bgObjects[i].postUpdate();
	}
}

//-------------------------------------------------------------------------------------------------------------------

function Portal () {
	this.obj = new Phaser.Rectangle(0, 0, 320, 256);
	this.bounds = this.obj;
	this.lastPos = new Phaser.Rectangle(0, 0, 320, 256);
	this.clickStartPos = new Phaser.Point(0, 0);
	this.showLayer = null;
	this.hideLayer = null;

	this.showTiles = [];
	this.hideTiles = [];
	this.state = {};
}

Portal.prototype.init = function (showLayer, hideLayer) {
	this.obj.x = 0;
	this.obj.y = 0;
	this.lastPos.x = this.obj.x;
	this.lastPos.y = this.obj.y;
	this.showLayer = showLayer;
	this.hideLayer = hideLayer;
	this.showTiles = [];
	this.hideTiles = [];

	this.state['moved'] = false;
	this.state['dragging'] = false;
}

Portal.prototype.getTiles = function () {
	return tiles;
}

Portal.prototype.refreshTiles = function () {
	//this.tiles = this.layer.getTiles(game.camera.x + this.obj.x, game.camera.y + this.obj.y, this.obj.width - 32, this.obj.height - 32);

	//For smooth movement
	this.showTiles = this.showLayer.getTiles(this.obj.x, this.obj.y, this.obj.width - 32, this.obj.height - 32);
	this.hideTiles = this.hideLayer.getTiles(this.lastPos.x, this.lastPos.y, this.obj.width - 32, this.obj.height - 32);
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
	this.obj = game.add.sprite(0, 0, 'player');
	this.lastPos = new Phaser.Point(0, 0);
	this.state = {};
	
	game.physics.enable(this.obj, Phaser.Physics.ARCADE);
}

Player.prototype.init = function () {
	this.obj.x = 608;
	this.obj.y = 1824;
	this.lastPos.x = this.obj.x;
	this.lastPos.y = this.obj.y;
	this.state['moved'] = false;

	this.obj.body.setSize(24, 32);
	this.obj.body.collideWithWorldBounds = true;
	//this.obj.body.bounce.y = 0.2;
	this.obj.body.bounce.x = 0.0;
	this.obj.body.linearDamping = 1.0;
}

Player.prototype.update = function () {
	this.state['moved'] = false;
	this.state['on_ladder'] = false;

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

	game.physics.arcade.overlap(this.obj, ladders, function (player, ladder) {
		if (game.input.keyboard.isDown(87)) {
			player.body.velocity.y = -100;
		}
		else {
			player.body.velocity.y = 0;
			player.body.allowGravity = false;
		}
		this.state['on_ladder'] = true;
	}.bind(this));
}

Player.prototype.postUpdate = function () {
	if (this.state['moved']) {
		this.lastPos.x = this.obj.x;
		this.lastPos.y = this.obj.y;
	}

	if (!this.state['on_ladder']) {
		this.obj.body.allowGravity = true;
	}
}

//-------------------------------------------------------------------------------------------------------------------

function Ladder(th, layer) {
	this.obj = game.add.tileSprite(0, 0, TILE_WIDTH, th * TILE_HEIGHT, 'spritesheet', 0, ladders);
	this.visibleArea = game.add.graphics(0, 0);
	this.bounds = new Phaser.Rectangle(0, 0, this.obj.width, this.obj.height);
	this.layer = layer;
	this.state = {};

	game.physics.enable(this.obj, Phaser.Physics.ARCADE);
	this.obj.body.setSize(18, th * TILE_HEIGHT, 8, 0);
	this.obj.body.allowGravity = false;
}

Ladder.prototype.init = function (tx, ty) {
	this.obj.x = tx * TILE_WIDTH;
	this.obj.y = ty * TILE_HEIGHT;
	this.bounds.x = this.obj.x;
	this.bounds.y = this.obj.y;

	this.updateVisibility(this.bounds, new Phaser.Rectangle(0, 0, 0, 0));
}

Ladder.prototype.update = function () {
}

Ladder.prototype.postUpdate = function () {
	if (portal.state['moved']) {
		this.updateVisibility(this.bounds, portal.bounds);
	}
}

Ladder.prototype.updateVisibility = function (objBounds, portalBounds) {
	var intersectRect = Phaser.Rectangle.intersection(portalBounds, objBounds);
	this.visibleArea.clear();
	this.obj.body.enable = true;
	if (this.layer === levelManager.bgLayer) {
		if (!intersectRect.empty) {
			if (Phaser.Rectangle.equals(intersectRect, objBounds)) {
				this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height);
				this.obj.body.setSize(18, objBounds.height, 8, 0);
			}
			else {
				if (intersectRect.top === objBounds.top) {
					this.visibleArea.drawRect(objBounds.left, intersectRect.top, objBounds.width, intersectRect.height);
					this.obj.body.setSize(18, intersectRect.height, 8, 0);
				}
				else {
					this.visibleArea.drawRect(objBounds.left, intersectRect.top, objBounds.width, intersectRect.height);
					this.obj.body.setSize(18, intersectRect.height, 8, objBounds.height - intersectRect.height);	
				}
			}
		}
		else {
			this.visibleArea.drawRect(0, 0, 0, 0);
			this.obj.body.enable = false;
		}
	}
	else if (this.layer === levelManager.fgLayer) {
		if (!intersectRect.empty) {
			if (Phaser.Rectangle.equals(intersectRect, objBounds)) {
				this.visibleArea.drawRect(0, 0, 0, 0);
				this.obj.body.enable = false;
			}
			else {
				if (intersectRect.top === objBounds.top) {
					this.visibleArea.drawRect(intersectRect.left, intersectRect.bottom, objBounds.width, objBounds.height - intersectRect.height);
					this.obj.body.setSize(18, objBounds.height - intersectRect.height, 8, intersectRect.height);
				}
				else {
					this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height - intersectRect.height);
					this.obj.body.setSize(18, objBounds.height - intersectRect.height, 8, 0);	
				}
			}
		}
		else {
			this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height);
			this.obj.body.setSize(18, objBounds.height, 8, 0);
		}
	}

	this.obj.mask = this.visibleArea;
}

//-------------------------------------------------------------------------------------------------------------------

function Platform(platformLength, layer) {
	this.obj = game.add.sprite(0, 0, null, null, platforms);
	game.physics.enable(this.obj, Phaser.Physics.ARCADE);
	this.visibleArea = game.add.graphics(0, 0);
	this.bounds = new Phaser.Rectangle(0, 0, platformLength * TILE_WIDTH, TILE_HEIGHT);
	this.moveBounds = new Phaser.Rectangle(0, 0, 0, TILE_HEIGHT);
	this.layer = layer;
	this.state = {};

	for (var i = 0; i < platformLength; i++) {
		var frame = 2;
		if (i === 0) {
			frame = 1;
		}
		else if (i === platformLength - 1) {
			frame = 3;
		}

		var obj = game.add.sprite(i * TILE_WIDTH, 0, 'spritesheet', frame);
		this.obj.addChild(obj);
	}

	this.obj.body.setSize(platformLength * TILE_WIDTH, TILE_HEIGHT);
	this.obj.body.allowGravity = false;
	this.obj.body.immovable = true;
}

Platform.prototype.init = function (tx, ty, tw, startIdx, direction, speed) {
	this.obj.x = (tx + startIdx) * TILE_WIDTH;
	this.obj.y = ty * TILE_HEIGHT;

	this.bounds.x = this.obj.x;
	this.bounds.y = this.obj.y;

	this.moveBounds.x = tx * TILE_WIDTH;
	this.moveBounds.y = ty * TILE_HEIGHT;
	this.moveBounds.width = tw * TILE_WIDTH;
	
	this.state['direction'] = direction;
	this.state['speed'] = speed;

	this.updateVisibility(this.bounds, new Phaser.Rectangle(0, 0, 0, 0));
}

Platform.prototype.update = function () {
	if (this.state['direction'] === "left") {
		if (this.obj.x <= this.moveBounds.left) {
			this.state['direction'] = 'right'
		}
	}
	else {
		if (this.obj.x + this.bounds.width >= this.moveBounds.right) {
			this.state['direction'] = 'left';
		}
	}

	if (this.state['direction'] === "left") {
		this.obj.body.velocity.x = -this.state['speed'] * 32;
	}
	else {
		this.obj.body.velocity.x = this.state['speed'] * 32;
	}
}

Platform.prototype.postUpdate = function () {
	this.bounds.x = this.obj.x;
	this.bounds.y = this.obj.y;

	this.updateVisibility(this.bounds, portal.bounds);
}

Platform.prototype.updateVisibility = function (objBounds, portalBounds) {
	var intersectRect = Phaser.Rectangle.intersection(portalBounds, objBounds);
	this.visibleArea.clear();
	if (this.layer === levelManager.bgLayer) {
		if (!intersectRect.empty) {
			if (Phaser.Rectangle.equals(intersectRect, objBounds)) {
				this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height);
				this.obj.body.setSize(objBounds.width, objBounds.height, 0, 0);
			}
			else {
				if (intersectRect.left === objBounds.left) {
					this.visibleArea.drawRect(intersectRect.left, objBounds.top, intersectRect.width, objBounds.height);
					this.obj.body.setSize(intersectRect.width, objBounds.height, 0, 0);
				}
				else {
					this.visibleArea.drawRect(intersectRect.left, objBounds.top, intersectRect.width, objBounds.height);
					this.obj.body.setSize(intersectRect.width, objBounds.height, objBounds.width - intersectRect.width, 0);
				}
			}
		}
		else {
			this.visibleArea.drawRect(0, 0, 0, 0);
			this.obj.body.setSize(0, 0, -10000, -10000);
			//this.obj.body.enable = false;
		}
	}
	else if (this.layer === levelManager.fgLayer) {
		if (!intersectRect.empty) {
			if (Phaser.Rectangle.equals(intersectRect, objBounds)) {
				this.visibleArea.drawRect(0, 0, 0, 0);
				this.obj.body.setSize(0, 0, -10000, -10000);
				//this.obj.body.enable = false;
			}
			else {
				if (intersectRect.left === objBounds.left) {
					this.visibleArea.drawRect(intersectRect.right, objBounds.top, objBounds.width - intersectRect.width, objBounds.height);
					this.obj.body.setSize(objBounds.width - intersectRect.width, objBounds.height, intersectRect.width, 0);
				}
				else {
					this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width - intersectRect.width, objBounds.height);
					this.obj.body.setSize(objBounds.width - intersectRect.width, objBounds.height, 0, 0);
				}
			}
		}
		else {
			this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height);
			this.obj.body.setSize(objBounds.width, objBounds.height, 0, 0);
		}
	}

	this.obj.mask = this.visibleArea;
}

//-------------------------------------------------------------------------------------------------------------------

function Spikes(tw, layer) {
	this.obj = game.add.tileSprite(0, 0, tw * TILE_WIDTH, TILE_HEIGHT, 'spritesheet', 5, spikes);
	this.visibleArea = game.add.graphics(0, 0);
	this.bounds = new Phaser.Rectangle(0, 0, this.obj.width, this.obj.height);
	this.layer = layer;
	this.state = {};

	game.physics.enable(this.obj, Phaser.Physics.ARCADE);
	this.obj.body.setSize(this.obj.width, this.obj.height);
	this.obj.body.allowGravity = false;
}

Spikes.prototype.init = function (tx, ty) {
	this.obj.x = tx * TILE_WIDTH;
	this.obj.y = ty * TILE_HEIGHT;
	this.bounds.x = this.obj.x;
	this.bounds.y = this.obj.y;

	this.updateVisibility(this.bounds, new Phaser.Rectangle(0, 0, 0, 0));
}

Spikes.prototype.update = function () {
}

Spikes.prototype.postUpdate = function () {
	if (portal.state['moved']) {
		this.updateVisibility(this.bounds, portal.bounds);
	}
}

Spikes.prototype.updateVisibility = function (objBounds, portalBounds) {
	var intersectRect = Phaser.Rectangle.intersection(portalBounds, objBounds);
	this.visibleArea.clear();
	this.obj.body.enable = true;
	if (this.layer === levelManager.bgLayer) {
		if (!intersectRect.empty) {
			if (Phaser.Rectangle.equals(intersectRect, objBounds)) {
				this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height);
				this.obj.body.setSize(objBounds.width, objBounds.height, 0, 0);
			}
			else {
				if (intersectRect.left === objBounds.left) {
					this.visibleArea.drawRect(intersectRect.left, objBounds.top, intersectRect.width, objBounds.height);
					this.obj.body.setSize(intersectRect.width, objBounds.height, 0, 0);
				}
				else {
					this.visibleArea.drawRect(intersectRect.left, objBounds.top, intersectRect.width, objBounds.height);
					this.obj.body.setSize(intersectRect.width, objBounds.height, objBounds.width - intersectRect.width, 0);
				}
			}
		}
		else {
			this.visibleArea.drawRect(0, 0, 0, 0);
			this.obj.body.enable = false;
		}
	}
	else if (this.layer === levelManager.fgLayer) {
		if (!intersectRect.empty) {
			if (Phaser.Rectangle.equals(intersectRect, objBounds)) {
				this.visibleArea.drawRect(0, 0, 0, 0);
				this.obj.body.enable = false;
			}
			else {
				if (intersectRect.left === objBounds.left) {
					this.visibleArea.drawRect(intersectRect.right, objBounds.top, objBounds.width - intersectRect.width, objBounds.height);
					this.obj.body.setSize(objBounds.width - intersectRect.width, objBounds.height, intersectRect.width, 0);
				}
				else {
					this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width - intersectRect.width, objBounds.height);
					this.obj.body.setSize(objBounds.width - intersectRect.width, objBounds.height, 0, 0);
				}
			}
		}
		else {
			this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height);
			this.obj.body.setSize(objBounds.width, objBounds.height, 0, 0);
		}
	}

	this.obj.mask = this.visibleArea;
}

//-------------------------------------------------------------------------------------------------------------------

function Hook(layer) {
	this.obj = game.add.sprite(0, 0, 'spritesheet', 6, hooks);
	this.visibleArea = game.add.graphics(0, 0);
	this.bounds = new Phaser.Rectangle(0, 0, this.obj.width, this.obj.height);
	this.layer = layer;
	this.state = {};
	
	this.key = null;

	game.physics.enable(this.obj, Phaser.Physics.ARCADE);
	this.obj.body.setSize(this.obj.width, this.obj.height);
	this.obj.body.allowGravity = false;
}

Hook.prototype.init = function (tx, ty, key) {
	this.obj.x = tx * TILE_WIDTH;
	this.obj.y = ty * TILE_HEIGHT;
	this.bounds.x = this.obj.x;
	this.bounds.y = this.obj.y;
	this.key = key;

	this.updateVisibility(this.bounds, new Phaser.Rectangle(0, 0, 0, 0));
}

Hook.prototype.update = function () {
}

Hook.prototype.postUpdate = function () {
	if (portal.state['moved']) {
		this.updateVisibility(this.bounds, portal.bounds);
	}
}

Hook.prototype.updateVisibility = function (objBounds, portalBounds) {
	var intersectRect = Phaser.Rectangle.intersection(portalBounds, objBounds);
	this.visibleArea.clear();
	this.obj.body.enable = true;
	if (this.layer === levelManager.bgLayer) {
		if (!intersectRect.empty) {
			this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height);
			this.obj.body.setSize(objBounds.width, objBounds.height, 0, 0);
		}
		else {
			this.visibleArea.drawRect(0, 0, 0, 0);
			this.obj.body.enable = false;
		}
	}
	else if (this.layer === levelManager.fgLayer) {
		if (!intersectRect.empty) {
			this.visibleArea.drawRect(0, 0, 0, 0);
			this.obj.body.enable = false;
		}
		else {
			this.visibleArea.drawRect(objBounds.left, objBounds.top, objBounds.width, objBounds.height);
			this.obj.body.setSize(objBounds.width, objBounds.height, 0, 0);
		}
	}

	this.obj.mask = this.visibleArea;
}