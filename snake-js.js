/**
 * Snake-JS
 * 
 * By Didrik Nordstrom, http://betamos.se
 * Follow the project on github: http://github.com/betamos/Snake-JS
 * MIT Licensed
 */

/**
 * MAIN GAME OBJECT
 *
 * Everything associated with the snake game should be encapsulated within
 * this function to avoid pollution of the global namespace
 */
function SnakeJS(parentElement, config){

	var utilities = new Utilities();

	var defaultConfig = {
		autoInit : true,					// Game inits automagically
		gridWidth : 30,						// Width of the game grid
		gridHeight : 20,					// Height of the game grid
		frameInterval : 150,				// Milliseconds between frames (@todo change to speed?)
		pointSize : 24,						// Size of one grid point
		backgroundColor : "#E0B687",		// Color of the background. CSS3 color values
		snakeColor: "#CF2900",				// Color of the snake
		snakeEyeColor : "white",			// Color of the snake's eye
		candyColor : "#b11c1c",				// Color of the candy
		shrinkingCandyColor : "#199C2C",	// Color of the special candy that shrinks
		scoreBoardColor : "#c0c96b",		// Color of the score board
		scoreTextColor : "#4b4312",			// Color of the score numbers on the score board
		gridColor: "#754C24",				// Color of the game grid
		numberLineColor: "#ffffff",			// Color of the number line
		collisionTolerance : 1,				// Still frames before collision. More = easier
		difficulty: 3
	}; 

	// Merge user config with default config
	var config = config ? utilities.mergeObjects(defaultConfig, config) : defaultConfig ;

	var constants = {
	    DIRECTION_UP : 1,
	    DIRECTION_RIGHT : 2,
	    DIRECTION_DOWN : -1,
	    DIRECTION_LEFT : -2,
	    DEFAULT_DIRECTION : 2,
	    STATE_READY : 1,
	    STATE_PAUSED : 2,
	    STATE_PLAYING : 3,
	    STATE_GAME_OVER : 4,
	    INITIAL_SNAKE_GROWTH_LEFT : 1,
	    SCOREBOARD_HEIGHT: 150,
	    BRANCH_HEIGHT: 75,
	    GOAL_WIDTH: 75,
	    GOAL_HEIGHT: 75,
		CANDY_REGULAR : 1,
		CANDY_MASSIVE : 2,
		CANDY_SHRINKING : 3,
		CANDY_AMOUNT : 4
	};

	var engine = new Engine(parentElement);

	/**
	 * These methods below (init, pause, resume) are publically accessible.
	 */
	this.init = function(){
		engine.initGame();
	};

	this.pause = function(){
		engine.pauseGame();
	};

	this.resume = function(){
		engine.resume();
	};

	this.getHighScore = function(){
		return engine.getHighScore();
	};

	/**
	 * GAME MODEL OBJECT
	 *
	 * This object is doing the game logic, frame management etc.
	 */
	function Engine(parentElement) {
		
		var snake,					// The snake itself
			candy = [],				// The candy which the snake eats
			view,					// The view object which draws the points to screen
			inputInterface,			// Responsible for handling input from the user
			grid,					// The grid object
			currentState,			// Possible values are found in constants.STATE_*
			frameIntervalId,		// The ID of the interval timer
			score,					// Player score
			bonusTimer,				// time based round bonus
			highScore,				// Player highScore
			count,					// Current sum of candies eaten
			target,					// Total Player is trying to reach 
			collisionFramesLeft;	// If the snake collides, how many frames are left until death

		this.initGame = function(){

			view = new View(parentElement, config.backgroundColor);
			inputInterface = new InputInterface(this.pauseGame, this.resumeGame, startMoving);

			snake = new Snake();
			grid = new Grid(config.gridWidth, config.gridHeight);
			score = 0;
			highScore = score;

			// Create snake body
			snake.points.push(randomPoint(grid));
			snake.growthLeft = constants.INITIAL_SNAKE_GROWTH_LEFT;

			// set target the the children are aiming for
			switch( config.difficulty){
				case 1:
				case 3:
					target = 10;
				break;
				case 2:
					target=20;
				break;
			}

			engine.initRound();

			view.initPlayField();
			drawCurrentScene();
			inputInterface.startListening();
			view.playBgAudio();
			currentState = constants.STATE_READY;
			
		};

		this.initRound = function(){
			count = 0;
			generateCandy();
			bonusTimer = new Date();
		}

		this.pauseGame = function(){
			if (currentState === constants.STATE_PLAYING) {
				clearInterval(frameIntervalId);
				currentState = constants.STATE_PAUSED;
			}
		};

		this.resumeGame = function(){
			if (currentState === constants.STATE_PAUSED) {
				frameIntervalId = setInterval(nextFrame, config.frameInterval);
				currentState = constants.STATE_PLAYING;
			}
		};

		this.getHighScore = function(){
			return highScore;
		};

		/**
		 * Private methods below
		 */

		// Play a game over scene and restart the game
		var gameOver = function(){
			currentState = constants.STATE_GAME_OVER;
			clearInterval(frameIntervalId);

			// Remove one point from the snakes tail and recurse with a timeout
			var removeTail = function(){
				if (snake.points.length > 1) {
					snake.points.pop();
					drawCurrentScene();
					setTimeout(removeTail, config.frameInterval/4);
				}
				else
					setTimeout(resurrect, config.frameInterval * 10);
			};

			var resurrect = function (){
				score = 0;
				snake.growthLeft = constants.INITIAL_SNAKE_GROWTH_LEFT;
				snake.alive = true;
				count = 0;
				generateCandy();
				drawCurrentScene();
				currentState = constants.STATE_READY;
			};

			setTimeout(removeTail, config.frameInterval * 10);
		};

		var startMoving = function(){
			if (currentState === constants.STATE_READY) {
				frameIntervalId = setInterval(nextFrame, config.frameInterval);
				currentState = constants.STATE_PLAYING;
			}
		};

		// Calculates what the next frame will be like and draws it.
		var nextFrame = function(){
		    var vClearCandy = false;

			// If the snake can't be moved in the desired direction due to collision
			if (!moveSnake(inputInterface.lastDirection())) {
				if (collisionFramesLeft > 0) {
					// Survives for a little longer
					collisionFramesLeft--;
					return;
				}
				else {
					// Now it's dead
					snake.alive = false;
					// Draw the dead snake
					drawCurrentScene();
				    // Play sad music
					view.playFailAudio();
					// And play game over scene
					gameOver();
					return;
				}
			}
			// It can move.
			else
				collisionFramesLeft = config.collisionTolerance;

			candy.forEach(function(curCandy,index){
				// If the snake hits a candy
				if(curCandy.point.collidesWith(snake.points[0])) {
					eatCandy(curCandy);
					candy.splice(index,1);

					if (count == target){
						// win
					    score += 10;
					    score += bonusPoints();
					    vClearCandy  = true;
					    view.playWinAudio();
					    view.setCaterStatus(2); //happy
					    setTimeout(function () {
					        view.setCaterStatus(0); //neutral
					        engine.initRound();
					    }, 1000);
					}
					else if (count > target){
					    // lose
					    if (score > 4) {
					        score -= 5;
					    }
					    vClearCandy = true;
					    view.playFailAudio();
					    view.setCaterStatus(1); //sad
					    setTimeout(function () {
					        view.setCaterStatus(0); //neutral
					        engine.initRound();						
					    }, 1000);
					} //else if
				} // if snake hits a candy
			}); //candy.foreach
			
			drawCurrentScene();

			if (vClearCandy) {
			    clearCandy();
			}

			function clearCandy() {
			    var length = candy.length;
			    while(length--){
			        candy.splice(length, 1);
			    }
			}
		};

		var bonusPoints = function () {
		    var curDate = new Date();
		    var elapsed = (bonusTimer - curDate) * -1;
		    if (elapsed < 10000) {
		        return 3;
		    }
		    else if (elapsed < 20000) {
		        return 2;
		    }
		    else if (elapsed < 30000) {
		        return 1;
		    }
		    else {
		        return 0;
		    }
		}

		var drawCurrentScene = function() {
			// Clear the view to make room for a new frame
			view.clear();
			// Draw the objects to the screen
			view.drawSnake(snake, config.snakeColor);

			candy.forEach(function(curCandy,index){
				view.drawCandy(curCandy);
			});

			view.drawScore(score, highScore, target, count);
		};

		// Move the snake. Automatically handles self collision and walking through walls
		var moveSnake = function(desiredDirection){
			var head = snake.points[0];

			// The direction the snake will move in this frame
			var newDirection = actualDirection(desiredDirection || constants.DEFAULT_DIRECTION);

			var newHead = movePoint(head, newDirection);

			if (!insideGrid(newHead, grid))
				shiftPointIntoGrid(newHead, grid);

			if (snake.collidesWith(newHead, true)) {
				// Can't move. Collides with itself
				return false;
			}

			if (snake.direction != newDirection) {
			    view.playDirectionAudio();
			}

			snake.direction = newDirection;
			snake.points.unshift(newHead);

			if (snake.growthLeft >= 1)
				snake.growthLeft--;
			else
				snake.points.pop();
			
			return true;
		};

		var eatCandy = function(candy){
			count += candy.score;
			highScore = Math.max(score, highScore);
			snake.growthLeft += candy.calories;
			view.playEatAudio();
		};

		var randomCandy = function(value) {
			// Find a new position for the candy, and make sure it's not inside the snake
			do {
				var newCandyPoint = randomPoint(grid);
			} while(snake.collidesWith(newCandyPoint));

			return new Candy(newCandyPoint, value);
		};

		var generateCandy = function() {
			var mod = 2; //Offset index by 2 for pair 2 on difficulty 1 and 2
			var pair1 = generateCandyPair();
			var pair2 = generateCandyPair();

			if (config.difficulty == 3){ //Offset index by 2 for pair 2 on difficulty 3
				mod = 3;
			}

			pair1.forEach(function(element, index){
				candy[index] = randomCandy(element);
			});

			pair2.forEach(function(element, index){
				candy[index + mod] = randomCandy(element);
			});

		}

		var generateCandyPair = function() {
			var candyPair;
			
			// find pair of candy (1 + 1)
			if (config.difficulty < 3){
				var value;

				do {
					value = Math.ceil(Math.random() * target);
				} while(value >= target || value <= 0);

				candyPair = [value, target - value];
			}
			// find pair of candy (1 + 1 + 1)
			else {
				var val1,val2,val3;

				do{

					do {
						val1 = Math.ceil(Math.random() * target);
						val2 = target - val1;
					} while(val1 >= target || val1 <= 0);

					if (val1 >= val2){
						var tempVal = val1;
						do {
							val3 = Math.ceil(Math.random() * tempVal);
							val1 = tempVal - val3;
						} while(val3 >= tempVal || val3 <= 0);
					}
					else{ // val2 > val1
						var tempVal = val2;
						do {
							val3 = Math.ceil(Math.random() * tempVal);
							val2 = tempVal - val3;
						} while(val3 >= tempVal || val3 <= 0);
					}

					candyPair = [val1,val2,val3];

				}while((val1 + val2 + val3) != target);

			}
			
			return candyPair;
			
		};

		var randomCandyLocation = function() {
			// Find a new position for the candy, and make sure it's not inside the snake
			do {
				var newCandyPoint = randomPoint(grid);
			} while(snake.collidesWith(newCandyPoint));
			return newCandyPoint;
		};

		// Get the direction which the snake will go this frame
		// The desired direction is usually provided by keyboard input
		var actualDirection = function(desiredDirection){
			if (snake.points.length === 1)
				return desiredDirection;
			else if (utilities.oppositeDirections(snake.direction, desiredDirection)) {
				// Continue moving in the snake's current direction
				// ignoring the player
				return snake.direction;
			}
			else {
				// Obey the player and move in that direction
				return desiredDirection;
			}
		};

		// Take a point (oldPoint), "move" it in any direction (direction) and
		// return a new point (newPoint) which corresponds to the change
		// Does not care about borders, candy or walls. Just shifting position.
		var movePoint = function(oldPoint, direction){
			var newPoint;
			with (constants) {
				switch (direction) {
				case DIRECTION_LEFT:
					newPoint = new Point(oldPoint.left-1, oldPoint.top);
					break;
				case DIRECTION_UP:
					newPoint = new Point(oldPoint.left, oldPoint.top-1);
					break;
				case DIRECTION_RIGHT:
					newPoint = new Point(oldPoint.left+1, oldPoint.top);
					break;
				case DIRECTION_DOWN:
					newPoint = new Point(oldPoint.left, oldPoint.top+1);
					break;
				}
			}
			return newPoint;
		};

		// Shifts the points position so that it it is kept within the grid
		// making it possible to "go thru" walls
		var shiftPointIntoGrid = function(point, grid){
			point.left = shiftIntoRange(point.left, grid.width);
			point.top = shiftIntoRange(point.top, grid.height);
			return point;
		};

		// Helper function for shiftPointIntoGrid
		// E.g. if number=23, range=10, returns 3
		// E.g.2 if nubmer = -1, range=10, returns 9
		var shiftIntoRange = function(number, range) {
			var shiftedNumber, steps;
			if (utilities.sign(number) == 1){
				steps = Math.floor(number/range);
				shiftedNumber = number - (range * steps);
			}
			else if (utilities.sign(number) == -1){
				steps = Math.floor(Math.abs(number)/range) + 1;
				shiftedNumber = number + (range * steps);
			}
			else {
				shiftedNumber = number;
			}
			return shiftedNumber;
		};

		// Check if a specific point is inside the grid
		// Returns true if inside, false otherwise
		var insideGrid = function(point, grid){
			if (point.left < 0 || point.top < 0 ||
					point.left >= grid.width || point.top >= grid.height){
				return false;
			}
			else {
				return true;
			}
		};

		// Returns a point object with randomized coordinates within the grid
		var randomPoint = function(grid){
			var left = utilities.randomInteger(0, grid.width - 1);
			var top = utilities.randomInteger(0, grid.height - 1);
			var point = new Point(left, top);
			return point;
		};
	}

	/**
	 * GRID OBJECT
	 *
	 * This object holds the properties of the grid.
	 */
	function Grid(width, height) {
		this.width = width;
		this.height = height;
	}

	/**
	 * SNAKE OBJECT
	 *
	 * The snake itself...
	 */
	function Snake() {
		this.direction = constants.DEFAULT_DIRECTION;
		this.points = [];
		this.growthLeft = 0;
		this.alive = true;

		// Check if any of this objects points collides with an external point
		// Returns true if any collision occurs, false otherwise
		// @param simulateMovement boolean Simulates the removal of the end point
		// This addresses a bug where the snake couldn't move to a point which
		// is not currently free, but will be in the next frame
		this.collidesWith = function(point, simulateMovement){
			if (simulateMovement && this.growthLeft === 0)
				// Now th
				range = this.points.length - 1;
			else
				range = this.points.length;
			for (var i = 0; i < range; i++) {
				if (point.collidesWith(this.points[i]))
					return true;
			}
			return false;
		};
	}

	/**
	 * POINT OBJECT
	 *
	 * A point has a place in the grid and can be passed
	 * to View for drawing.
	 */
	function Point(left, top) {
		this.left = left;
		this.top = top;

		// Check if this point collides with another
		this.collidesWith = function(otherPoint){
			if (otherPoint.left == this.left && otherPoint.top == this.top)
				return true;
			else
				return false;
		};
	}

	/**
	 * CANDY OBJECT
	 * 
	 * @param point The point object which determines the position of the candy
	 * @param type Any type defined in constants.CANDY_*
	 */
	function Candy(point, value){
		this.point = point,
		this.score,			// Increment in score when eaten by snake
		this.calories,		// How much growth the snake gains if it eats this candy
		this.radius,		// Radius of the candy, relative to config.pointSize
		this.color,			// Color of the candy
		this.decrement,		// If greater than 0, the radius of the candy will shrink...
		this.minRadius;		// until it reaches this minimum value. Then it will disappear

		this.score = value;
		this.calories = 1;
		this.radius = 0.45;
		this.color = config.candyColor;

		// Shrinks a CANDY_SHRINKING candy. Returns false if candy is below minRadius
		this.age = function(){
			// Currently only CANDY_SHRINKING reacts to ageing
			if (this.type === constants.CANDY_SHRINKING) {
				this.radius -= this.decrement;
				if (this.radius < this.minRadius)
					return false;
				else
					return true;
			}
			else
				return true;
		};
	};
	
	/**
	 * UTILITIES OBJECT
	 *
	 * Provides some utility methods which don't fit anywhere else.
	 */
	function Utilities() {

		// Takes a number and returns the sign of it.
		// E.g. -56 -> -1, 57 -> 1, 0 -> 0
		this.sign = function(number){
			if(number > 0)
				return 1;
			else if (number < 0)
				return -1;
			else if (number === 0)
				return 0;
			else
				return undefined;
		};

		// Helper function to find if two directions are in opposite to each other
		// Returns true if the directions are in opposite to each other, false otherwise
		this.oppositeDirections = function(direction1, direction2){
	
			// @see Declaration of constants to understand.
			// E.g. UP is defined as 1 while down is defined as -1
			if (Math.abs(direction1) == Math.abs(direction2) &&
					this.sign(direction1 * direction2) == -1) {
				return true;
			}
			else {
				return false;
			}
		};

		// Merge two flat objects and return the modified object.
		this.mergeObjects = function mergeObjects(slave, master){
			var merged = {};
			for (key in slave) {
				if (typeof master[key] === "undefined")
					merged[key] = slave[key];
				else
					merged[key] = master[key];
			}
			console.log(merged);
			return merged;
		};

		// Returns an integer between min and max, including both min and max
		this.randomInteger = function(min, max){
			var randomNumber = min + Math.floor(Math.random() * (max + 1));
			return randomNumber;
		};
	}

	/**
	 * VIEW OBJECT
	 *
	 * This object is responsible for drawing the objects to the screen.
	 * It uses the HTML5 Canvas element for drawing.
	 */
	function View(parentElement, backgroundColor) {
		var playField,			// The DOM <canvas> element
			candyImg,			// Leaf image for candy
            branchImg,          // Branch image for score
            goalImg,            // Leaf image for goal progress
            failAudio,          // Audio clip for doing something wrong
            winAudio,           // Audio clip for doing something correct
            eatAudio,           // Audio clip for eating candy
            bgAudio,            // Background Audio
            moveDirectionAudio, // Audio clip for changing directions
            caterImgs = new Array(),          // Caterpiller images
            caterWidth = 225,   // Caterpiller image width
            caterHeight = 150,   // Caterpiller image height
            caterStatus = 0,        // Status of Caterpiller image (happy,sad,neutral)
			ctx,				// The canvas context
			snakeThickness;		// The thickness of the snake in pixels

		//Load Images
		candyImg = document.getElementById('candyImg');
		branchImg = document.getElementById('branchImg');
		goalImg = document.getElementById('goalImg');
		caterImgs[0] = document.getElementById('caterNeutral');
		caterImgs[1] = document.getElementById('caterSad');
		caterImgs[2] = document.getElementById('caterHappy');

	    //Load Audio Clips
		moveDirectionAudio = document.getElementById('moveDirectionAudio');
		winAudio = document.getElementById('winAudio');
		failAudio = document.getElementById('failAudio');
		eatAudio = document.getElementById('eatAudio');
		bgAudio = document.getElementById('bgAudio');
		bgAudio.loop = true;

		this.initPlayField = function(){
			snakeThickness = length(0.9);

			playField = document.createElement("canvas");
			playField.setAttribute("id", "snake-js");
			playField.setAttribute("width", config.gridWidth * config.pointSize);
			playField.setAttribute("height", config.gridHeight * config.pointSize + constants.SCOREBOARD_HEIGHT);
			parentElement.appendChild(playField);
			ctx = playField.getContext("2d");
			// Translate the coordinates so that we don't need to care about the scoreboard
			// when we draw all the other stuff
			ctx.translate(0, constants.SCOREBOARD_HEIGHT);
		};

		// Draw the snake to screen
		this.drawSnake = function(snake, color){

			// If there is only one point
			if (snake.points.length === 1) {
				var position = getPointPivotPosition(snake.points[0]);

				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(position.left, position.top, snakeThickness/2, 0, 2*Math.PI, false);
				ctx.fill();
			}
			else {
				
				// Loop over the points, beginning with the head
				for (var i = 0; i < snake.points.length; i++) {
	
					// Short name for the point we're looking at now
					var currentPoint = snake.points[i];
					var currentPointPosition = getPointPivotPosition(currentPoint);

					if((i + 1) % 2 == 1){
						ctx.fillStyle = "#ED2024";
					}
					else{
						ctx.fillStyle = "#F7941D";
					}
					ctx.strokeStyle = "#000";
					ctx.beginPath();
					ctx.arc(currentPointPosition.left, currentPointPosition.top,snakeThickness/2,0,Math.PI*2,false);
					ctx.fill();
					ctx.stroke();
					
				}
			}

			// Draw the eye of the snake
			drawEye(snake, snake.direction);
		};

		this.drawCandy = function(candy){

			ctx.fillStyle = candy.color;

			var position = getPointPivotPosition(candy.point);

			if (candyImg.complete == true){
      			ctx.drawImage(candyImg, position.left - (config.pointSize /2), position.top - (config.pointSize /2), config.pointSize, config.pointSize);
			}
			
	    	// Prepare drawing text
			ctx.fillStyle = config.scoreTextColor;
			ctx.textAlign = "center";
			ctx.font = "bold 16px 'Courier new', monospace";

			ctx.fillText(candy.score, position.left, position.top + (config.pointSize /4));
		
		};

		this.clear = function(color) {
			ctx.fillStyle = color || backgroundColor;
			ctx.fillRect(0, 0,
					config.gridWidth * config.pointSize,
					config.gridHeight * config.pointSize);

			// draw grid 
			
			for (var x = 0; x < config.gridWidth; x++){
				
				ctx.strokeStyle = config.gridColor;
				ctx.lineWidth = 2;
				ctx.moveTo(x * config.pointSize ,0);
				ctx.lineTo(x * config.pointSize, config.gridHeight * config.pointSize);
				ctx.stroke();
			}
			for (var y = 0; y < config.gridHeight; y++){
				ctx.strokeStyle = config.gridColor;
				ctx.lineWidth = 2;
				ctx.moveTo(0, y * config.pointSize);
				ctx.lineTo(config.gridWidth * config.pointSize, y * config.pointSize);
				ctx.stroke();
			}
		};

		this.getCaterStatus = function () {
		    return caterStatus;
		};

		this.setCaterStatus = function (newStatus) {
		    caterStatus = newStatus;
		};

		this.drawScore = function (score, highScore, target, count) {
			// Translate to 0, 0 to draw from origo
			ctx.translate(0, -1 * constants.SCOREBOARD_HEIGHT);

			var topMargin = 20;
			var bottomMargin = 10;
			var horizontalMargin = 15;
			var tickHeight = 5;
			var lineMargin = 0;
			var tickWidth = ((config.gridWidth * config.pointSize - horizontalMargin - lineMargin) - (horizontalMargin + lineMargin)) / target;

			// Draw the score board
			ctx.fillStyle = config.scoreBoardColor;
			ctx.fillRect(0, 0, config.gridWidth * config.pointSize, constants.SCOREBOARD_HEIGHT);
    
		    // Draw Branch for "number line"
			if (branchImg.complete == true) {
			    ctx.drawImage(branchImg, 0, constants.SCOREBOARD_HEIGHT - constants.BRANCH_HEIGHT, config.pointSize * config.gridWidth, constants.BRANCH_HEIGHT);
			}

		    //Draw Caterpiller Icon
		    //Default to neutral
			if (caterStatus > 2 || caterStatus < 0) {
			    caterStatus = 0;
			}
			ctx.drawImage(caterImgs[caterStatus], ((config.gridWidth * config.pointSize) / 2) - (caterWidth / 2), -20, caterWidth, caterHeight);


		    // Draw goal leaf
			if (goalImg.complete == true) {
			    var x = horizontalMargin + lineMargin + (tickWidth * count);
			    var y = constants.SCOREBOARD_HEIGHT - constants.BRANCH_HEIGHT;
			    ctx.drawImage(goalImg, x - 10, y - (constants.GOAL_HEIGHT / 2), constants.GOAL_WIDTH, constants.GOAL_HEIGHT);
			}

		    // Prepare drawing text
			ctx.fillStyle = config.scoreTextColor;
			ctx.font = "bold 24px 'Courier new', monospace";

		    // Draw Number Line
            ctx.strokeStyle = config.numberLineColor;
			ctx.beginPath();
			ctx.moveTo(horizontalMargin + lineMargin, constants.SCOREBOARD_HEIGHT - (constants.BRANCH_HEIGHT / 2));
			ctx.lineTo(config.gridWidth * config.pointSize - horizontalMargin - lineMargin, constants.SCOREBOARD_HEIGHT - (constants.BRANCH_HEIGHT / 2));
			ctx.stroke();

		    ctx.textAlign = "center";
		    for (var i = 0; i <= target; i++) {
		        var x = horizontalMargin + lineMargin + (tickWidth * i);

                // Draw Tick Mark 
				ctx.fillStyle = config.numberLineColor;
			    ctx.beginPath();
			    ctx.moveTo(x, constants.SCOREBOARD_HEIGHT - (constants.BRANCH_HEIGHT / 2) - tickHeight);
			    ctx.lineTo(x, constants.SCOREBOARD_HEIGHT - (constants.BRANCH_HEIGHT / 2) + tickHeight);
			    ctx.stroke();

                //Print number
			    ctx.fillText(i, x, constants.SCOREBOARD_HEIGHT - bottomMargin);
            }

		    // Draw score to the upper right corner
			ctx.textAlign = "right";
			ctx.fillText(score, config.gridWidth * config.pointSize - horizontalMargin, topMargin);

		    // Draw high score in the upper left corner
			ctx.textAlign = "left";
			ctx.fillText(highScore, horizontalMargin, topMargin);

			// Translate back
			ctx.translate(0, constants.SCOREBOARD_HEIGHT);
		};

		// Draw the eye of the snake
		var drawEye = function(snake) {
			var head = snake.points[0];
			var headPosition = getPointPivotPosition(head);

			// Imagine the snake going from right to left.
			// These values determine how much to the left and top the eye's pivot point is adjusted.
			var offsetLeft = length(0.125);
			var offsetTop = length(0.15);

			// Place the eye's pivot point differentely depending on which direction the snake moves
			switch (snake.direction){
			case constants.DIRECTION_LEFT:
				headPosition.left -= offsetLeft;
				headPosition.top -= offsetTop;
				break;
			case constants.DIRECTION_RIGHT:
				headPosition.left += offsetLeft;
				headPosition.top -= offsetTop;
				break;
			case constants.DIRECTION_UP:
				headPosition.left -= offsetTop;
				headPosition.top -= offsetLeft;
				break;
			case constants.DIRECTION_DOWN:
				headPosition.left += offsetTop;
				headPosition.top += offsetLeft;
				break;
			}

			// If the snake is still alive draw a circle
			if (snake.alive) {
				ctx.beginPath();
				ctx.fillStyle = config.snakeEyeColor;
				// Draw the circle
				ctx.arc(headPosition.left, headPosition.top, length(0.125), 0, Math.PI*2, false);
				// And fill it
				ctx.fill();
			}
			// If the snake is dead, draw a cross
			else {
				ctx.beginPath();
				ctx.strokeStyle = config.snakeEyeColor;
				ctx.lineWidth = 2;
				ctx.moveTo(headPosition.left - length(0.1), headPosition.top - length(0.1));
				ctx.lineTo(headPosition.left + length(0.1), headPosition.top + length(0.1));
				ctx.moveTo(headPosition.left + length(0.1), headPosition.top - length(0.1));
				ctx.lineTo(headPosition.left - length(0.1), headPosition.top + length(0.1));
				ctx.stroke();
			}
		};

		// Short name to scale a length relative to config.pointSize
		var length = function(value){
			return value * config.pointSize;
		};

		var getPointPivotPosition = function(point) {
			var position = {
					left : point.left * length(1) + length(.5),
					top : point.top * length(1) + length(.5)
			};
			return position;
		};

		// Connect two points in opposite sides of the grid. Makes lines like Snake went through the wall
		// Presumes that the "pencil" is moved to position of p1
		var connectWallPoints = function(p1, p2) {

			// The position of these points in screen pixels
			var p2Position = getPointPivotPosition(p2);

			// This holds -1 or 1 if points are separated horizontally, else 0
			var leftOffset = utilities.sign(p2.left - p1.left);
			// This holds -1 or 1 if points are separated vertically, else 0
			var topOffset = utilities.sign(p2.top - p1.top);

			// First let's look at p1
			// Create a fake end point outside the grid, next to p1
			var fakeEndPoint = new Point(p1.left - leftOffset, p1.top - topOffset);
			// And get the screen position
			var fakeEndPointPosition = getPointPivotPosition(fakeEndPoint);
			// End the current line (which was initially drawn outside this method) in this fake point
			ctx.lineTo(fakeEndPointPosition.left, fakeEndPointPosition.top);

			// Let's look at p2. Create a fakepoint again and get it's position...
			var fakeStartPoint = new Point(p2.left + leftOffset, p2.top + topOffset);
			var fakeStartPointPosition = getPointPivotPosition(fakeStartPoint);
			// ...But this time, first move the pencil (without making a line) to the fake point
			ctx.moveTo(fakeStartPointPosition.left, fakeStartPointPosition.top);
			// Then make a line to p2. Note that these lines are not drawn, since this method
			// only connects the lines, the drawing is handled outside this method
			ctx.lineTo(p2Position.left, p2Position.top);
		};

		this.playDirectionAudio = function(){
		    moveDirectionAudio.play();
		}

		this.playWinAudio = function () {
		    winAudio.play();
		}

		this.playFailAudio = function () {
		    failAudio.play();
		}

		this.playEatAudio = function () {
		    eatAudio.play();
		}

		this.playBgAudio = function () {
		    bgAudio.play();
		}
	}

	/**
	 * INPUTINTERFACE OBJECT
	 * 
	 * Takes input from the user, typically key strokes to steer the snake but also window events
	 * 
	 * @param pauseFn A callback function to be executed when the window is blurred
	 * @param resumeFn A callback function which executes when the window is in focus again
	 * @param autoPlayFn A callback function which executes when any arrow key is pressed
	 */
	function InputInterface(pauseFn, resumeFn, autoPlayFn){

		var arrowKeys = [37, 38, 39, 40],	// Key codes for the arrow keys on a keyboard
			listening = false,				// Listening right now for key strokes etc?
			lastDirection = null;			// Corresponds to the last arrow key pressed

		/**
		 * Public methods below
		 */

		this.lastDirection = function(){
			return lastDirection;
		};

		// Start listening for player events
		this.startListening = function(){
			if (!listening) {
				window.addEventListener("keydown", handleKeyDown, true);
				window.addEventListener("keypress", disableKeyPress, true);
				window.addEventListener("blur", pauseFn, true);
				window.addEventListener("focus", resumeFn, true);
				listening = true;
			}
		};

		// Stop listening for events. Typically called at game end
		this.stopListening = function(){
			if (listening) {
				window.removeEventListener("keydown", handleKeyDown, true);
				window.removeEventListener("keypress", disableKeyPress, true);
				window.removeEventListener("blur", pauseFn, true);
				window.removeEventListener("focus", resumeFn, true);
				listening = false;
			}
		};

		/**
		 * Private methods below
		 */

		var handleKeyDown = function(event){
			// If the key pressed is an arrow key
			if (arrowKeys.indexOf(event.keyCode) >= 0) {
				handleArrowKeyPress(event);
			}
		};

		var disableKeyPress = function(event){
			// If the key pressed is an arrow key
			if (arrowKeys.indexOf(event.keyCode) >= 0) {
				event.preventDefault();
			}
		};

		var handleArrowKeyPress = function(event){
			with (constants) {
				switch (event.keyCode) {
				case 37:
					lastDirection = DIRECTION_LEFT;
					break;
				case 38:
					lastDirection = DIRECTION_UP;
					break;
				case 39:
					lastDirection = DIRECTION_RIGHT;
					break;
				case 40:
					lastDirection = DIRECTION_DOWN;
					break;
				}
			}
			// Arrow keys usually makes the browser window scroll. Prevent this evil behavior
			event.preventDefault();
			// Call the auto play function
			autoPlayFn();
		};
	}

	if (config.autoInit) {
		this.init();
	}
};
