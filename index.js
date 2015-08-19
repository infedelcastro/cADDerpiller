// If you are using jQuery, use < $(document).ready(function(){ ... }) > instead
document.addEventListener("DOMContentLoaded", function(){

	var startButton = document.getElementById("btnStart");
	var radioArray = document.getElementById('diffForm').diff;

	startButton.addEventListener("click", function(){

		var diffValue = radioArray.value

		// The DOM-element which will hold the playfield
		// If you are using jQuery, you can use < var element = $("#parent"); > instead
		var parentElement = document.getElementById("parent");

		// User defined settings overrides default settings.
		// See snake-js.js for all available options.
		var settings = {
		    frameInterval : 120,
		    difficulty: parseInt(diffValue,10)
		};

		//Hide start menu
		var startMenu = document.getElementById('startMenu');
		startMenu.style.visibility = 'hidden';
		startMenu.style.display = 'none';
		
		//hide start menu graphics/extend boarder
		var container = document.getElementById('container');
		container.style.backgroundImage = 'none';
		container.style.width = '720px'; 
		container.style.height = '990px'; 

		// Create the game object. The settings object is NOT required.
		// The parentElement however is required
		var game = new SnakeJS(parentElement, settings);
	});

	for (i = 0; i < radioArray.length; i++) {
	    radioArray[i].addEventListener("change", function (e) {
	        updateDirections();
	    });
	}

	function updateDirections() {
	    var selected;
	    var diffNum = document.getElementById('diffNum');

	    for (i = 0; i < radioArray.length; i++) {
	        if (radioArray[i].checked) {
	            selected = radioArray[i].value;
	            break;
	        }
	    }
	    switch (selected) {
	        case "1":
	            diffNum.innerHTML = "10";
	            break;
	        case "2":
	            diffNum.innerHTML = "20";
	            break;
	        case "3":
	            diffNum.innerHTML = "10";
	            break;
	    }
	}

	}, true);