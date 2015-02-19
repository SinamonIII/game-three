"use strict";

var GameState = function(game) {};

GameState.prototype.preload = function() {
	
	//Load the map from the json file and the tileset from the image
	this.load.tilemap('map', 'assets/MapWithTrees.json', null, Phaser.Tilemap.TILED_JSON);
    this.load.image('gameTiles', 'assets/RPGMakerTileset.png');
    
    this.load.image('powerUp', 'assets/dagger.png');
    
    this.game.load.spritesheet('player', 'assets/guy.png', 32, 48, 16);
    this.game.load.spritesheet('villan', 'assets/villan.png', 32, 48, 16);
    
    this.game.load.audio('bgMusic','assets/bgMusic.wav');
    
    console.log('preload');
    
};

GameState.prototype.create = function() {
	
	console.log('create');
	
	this.game.physics.startSystem(Phaser.Physics.ARCADE);
	
	
	console.log('adding sound, this is likely to take forever');
	
	this.audio = this.game.add.audio('bgMusic');
	this.audio.addMarker('bgMusic', 0, 166, 0.05, true);
	
	console.log('added sound');
	
    this.map = this.game.add.tilemap('map');
    
    //the first parameter is the tileset name as specified in Tiled, the second is the key to the asset
    this.map.addTilesetImage('RPGMakerTileset', 'gameTiles');

    
    console.log('adding layers and objects');
    
   		 //Create Layers
    
    //background layers
    this.background = this.map.createLayer('background');
    this.groundClutter = this.map.createLayer('groundClutter');
    
    //colliding layer
    this.collidingTerrain = this.map.createLayer('collidingTerrain');
	
	//create player
    var playerObject = this.findObjectsByType('playerStart', this.map, 'objects');
    this.player = this.game.add.sprite(playerObject[0].x, playerObject[0].y, 'player');
    this.addPlayerAnimations();
    this.game.physics.arcade.enable(this.player);
    this.player.power = 1;
    
    var villanObject = this.findObjectsByType('villan', this.map, 'objects');
    this.villan = this.game.add.sprite(villanObject[0].x, villanObject[0].y, 'villan');
    this.game.physics.arcade.enable(this.villan);
    this.villan.body.immovable = true;
	
	//top layer details
	this.nonCollidingTerrainFarBack = this.map.createLayer('nonCollidingTerrainFarBack');
	this.nonCollidingTerrainBack = this.map.createLayer('nonCollidingTerrainBack');
    this.nonCollidingTerrainFront = this.map.createLayer('nonCollidingTerrainFront');
    
	console.log('done adding layers and objects');

    //enable collision for the colliding layer
    this.map.setCollisionBetween(1, 10000, true, 'collidingTerrain');

    //resizes the game world to match the layer dimensions
    this.background.resizeWorld();

    this.createItems();

    

    //the camera will follow the player in the world
    this.game.camera.follow(this.player, Phaser.Camera.FOLLOW_TOPDOWN);

    
    
    //Set up input capture
    this.game.input.keyboard.addKeyCapture([
        Phaser.Keyboard.LEFT,
        Phaser.Keyboard.RIGHT,
        Phaser.Keyboard.UP,
        Phaser.Keyboard.DOWN,
        Phaser.Keyboard.SPACEBAR
    ]);
    
    this.audio.play('bgMusic');
};

GameState.prototype.addPlayerAnimations = function() {
	//Animations
	this.player.lastDirection = 'd';
	
	//							 name			 frames			fps		loop?
	this.player.animations.add(	'didle', 		[0], 			10, 	false);
	this.player.animations.add(	'lidle', 		[4], 			10, 	false);
	this.player.animations.add(	'ridle', 		[8], 			10, 	false);
	this.player.animations.add(	'uidle', 		[12], 			10, 	false);
	this.player.animations.add(	'walkDown',		[0,1,2,3], 		5, 		true);
	this.player.animations.add(	'walkLeft', 	[4,5,6,7], 		5, 		true);
	this.player.animations.add(	'walkRight',	[8,9,10,11],	5, 		true);
	this.player.animations.add(	'walkUp', 		[12,13,14,15], 	5, 		true);
	
};


GameState.prototype.createItems = function() {
    //create items
    this.items = this.game.add.group();
    this.items.enableBody = true;
    var item;    
    var result = this.findObjectsByType('item', this.map, 'objects');
    result.forEach(function(element){
      this.createFromTiledObject(element, this.items);
    }, this);
    this.items.scale.setTo(0.5,0.5);
  };
  
  
  //find objects in a Tiled layer that containt a property called "type" equal to a certain value
  GameState.prototype.findObjectsByType = function(type, map, layer) {
    var result = new Array();
    map.objects[layer].forEach(function(element){
      if(element.properties.type === type) {
        //Phaser uses top left, Tiled bottom left so we have to adjust
        //also keep in mind that the cup images are a bit smaller than the tile which is 16x16
        //so they might not be placed in the exact position as in Tiled
        element.y -= map.tileHeight;
        result.push(element);
      }      
    });
    return result;
  };
  
  //create a sprite from an object
  GameState.prototype.createFromTiledObject = function(element, group) {
    var sprite = group.create(element.x * 2, element.y * 2, element.properties.sprite);

      //copy all properties to the sprite
      Object.keys(element.properties).forEach(function(key){
        sprite[key] = element.properties[key];
      });
  };


GameState.prototype.update = function() {
	
	//Collision
    this.game.physics.arcade.collide(this.player, this.collidingTerrain);
    this.game.physics.arcade.overlap(this.player, this.villan, this.battle, null, this);
    this.game.physics.arcade.overlap(this.player, this.items, this.hitItem, null, this);

    
    
    //Update inputList based on the currently active input keys
    this.getInput();
    
    //Update the game based on the input
    this.move();
};

GameState.prototype.hitItem = function(player, item) {
	//Determine and execute the interaction between the player and the given item
	
	item.kill();
	player.power++;
};

GameState.prototype.battle = function(player, villan) {
	//Check whether the player is strong enough to kill the villan
	if(player.power >= 6) {
		villan.kill();
	}
	else {
		this.game.physics.arcade.collide(this.player, this.villan);
	}
};

GameState.prototype.getInput = function() {
	//Create a dictionary to track which input keys are active for the current frame   
	this.inputList = {'left': false, 'right': false, 'up': false, 'down': false, 'space': false};
	
	//Update inputList to reflect the active keys
	if (this.game.input.keyboard.isDown(Phaser.Keyboard.LEFT)) {
        this.inputList['left'] = true;
    } 
    if (this.game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)) {
        this.inputList['right'] = true;
    } 
    if (this.game.input.keyboard.isDown(Phaser.Keyboard.DOWN)) {
        this.inputList['down'] = true;
    } 
    if (this.game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
        this.inputList['up'] = true;
    }
    if (this.game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
        this.inputList['space'] = true;
    }
};



GameState.prototype.move = function() {
	//Update the game based on the information stored in inputList 
	
	//player movement
    this.player.body.velocity.y = 0;
    this.player.body.velocity.x = 0;
	
	//Set x and y velocity to determine movement
    if(this.inputList['up']) {
      this.player.body.velocity.y -= 100;
    }
    if(this.inputList['down']) {
      this.player.body.velocity.y += 100;
    }
    if(this.inputList['left']) {
      this.player.body.velocity.x -= 100;
    }
    if(this.inputList['right']) {
      this.player.body.velocity.x += 100;
    }
    
    //Check for action button input
    if(this.inputList['space']) {
    	this.doAction();
    }
    
    //Deal with updating the animations
    if(this.inputList['up'] && !this.inputList['down']) {
    	this.player.animations.play('walkUp');
    	this.player.lastDirection = 'u';
    }
    else if(!this.inputList['up'] && this.inputList['down']) {
    	this.player.animations.play('walkDown');
    	this.player.lastDirection = 'd';
    } 
    else if(this.inputList['left'] && !this.inputList['right']) {
    	this.player.animations.play('walkLeft');
    	this.player.lastDirection = 'l';
    }
    else if(!this.inputList['left'] && this.inputList['right']) {
    	this.player.animations.play('walkRight');
    	this.player.lastDirection = 'r';
    }
    else {
    	this.player.animations.play( (this.player.lastDirection + 'idle') );
    }
    
};

GameState.prototype.doAction = function() {
	//Execute the appropriate action
	
	//NO ACTIONS CURRENTLY IMPLEMENTED
};









var game = new Phaser.Game(848, 450, Phaser.AUTO, 'game');
game.state.add('game', GameState, true);