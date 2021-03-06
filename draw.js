"use strict"

var canvas;
var gl;
var program;

var points = [];
var textureCoords = [];
var normals = [];
var colors = [];
var shapes = [];

var thetaLoc, newPosLoc, scaleLoc;

var radius, camPhi, camTheta;
var far, near, fov, aspect;

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var modelViewMatrixLoc, modelViewMatrix;
var modelInverseTransposeLoc, modelInverseTranspose;
var projectionMatrixLoc, projectionMatrix;

var lights = [];
var diffuseProducts = [];
var specularProducts = [];
var lightPositionLoc1, lightPosition1 = vec4(4.0, 1.0, 2.0, 1.0);
var lightPositionLoc2, lightPosition2 = vec4(-3.0, 0.0, -2.0, 1.0);
var lightPositionLoc3, lightPosition3 = vec4(-1.0, 2.0, 4.0, 1.0);
var diffuseProductLoc1, diffuseProductLoc2, diffuseProductLoc3;
var specularProductLoc1, specularProductLoc2, specularProductLoc3;

var ambientColorLoc, ambientColor = vec4(0.05, 0.05, 0.05, 1.0);
var shininessLoc, shininess;

var lightIndex = 0, activeTexture = 0;

class Drawable {
    constructor(vertices, normals, color, texture, textureID, rotation, translation, scaling, program) {
        this.rotation = rotation;
        this.translation = translation;
        this.scaling = scaling;

        this.program = program;
        this.vertices = vertices;
        this.normals = normals
        this.color = color;
        this.texture = texture;
        this.textureID = textureID;

        this.vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);
        this.vAttributeLocation = gl.getAttribLocation(program, 'vPosition');

        this.nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);
        this.nAttributeLocation = gl.getAttribLocation(program, 'vNormal');

        this.cBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.color), gl.STATIC_DRAW);
        this.cAttributeLocation = gl.getAttribLocation(program, 'vColor');

        this.tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.texture), gl.STATIC_DRAW);
        this.tAttributeLocation = gl.getAttribLocation(program, 'vTextureCoord');
    }

    draw() {
        gl.uniform3fv(thetaLoc, this.rotation);
        gl.uniform3fv(newPosLoc, this.translation);
        gl.uniform3fv(scaleLoc, this.scaling);
        gl.uniform1i(gl.getUniformLocation(program, 'textureData'), this.textureID);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.vertexAttribPointer(this.vAttributeLocation, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vAttributeLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
        gl.vertexAttribPointer(this.nAttributeLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.nAttributeLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cBuffer);
        gl.vertexAttribPointer(this.cAttributeLocation, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.cAttributeLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
        gl.vertexAttribPointer(this.tAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.tAttributeLocation);

        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length);
    }
}

function main() {
    canvas = document.getElementById("mycanvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        console.log("Failed to get the rendering context for WebGL");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.07, 0.07, 0.07, 1);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    modelViewMatrixLoc = gl.getUniformLocation(program, 'mView');
    modelInverseTransposeLoc = gl.getUniformLocation(program, "mViewInverseTranspose");
    projectionMatrixLoc = gl.getUniformLocation(program, 'mProj');
    thetaLoc = gl.getUniformLocation(program, "theta");
    newPosLoc = gl.getUniformLocation(program, "newPos");
    scaleLoc = gl.getUniformLocation(program, "scale");

    lightPositionLoc1 = gl.getUniformLocation(program, "lightPosition1");
    diffuseProductLoc1 = gl.getUniformLocation(program, "diffuseProduct1");
    specularProductLoc1 = gl.getUniformLocation(program, "specularProduct1");
    diffuseProducts.push(vec4(1.0, 1.0, 1.0, 1.0));
    specularProducts.push(vec4(1.0, 1.0, 1.0, 1.0));

    lightPositionLoc2 = gl.getUniformLocation(program, "lightPosition2");
    diffuseProductLoc2 = gl.getUniformLocation(program, "diffuseProduct2");
    specularProductLoc2 = gl.getUniformLocation(program, "specularProduct2");
    diffuseProducts.push(vec4(0.0, 1.0, 0.0, 1.0));
    specularProducts.push(vec4(0.0, 1.0, 0.0, 1.0));

    lightPositionLoc3 = gl.getUniformLocation(program, "lightPosition3");
    diffuseProductLoc3 = gl.getUniformLocation(program, "diffuseProduct3");
    specularProductLoc3 = gl.getUniformLocation(program, "specularProduct3");
    diffuseProducts.push(vec4(0.0, 0.0, 1.0, 1.0));
    specularProducts.push(vec4(0.0, 0.0, 1.0, 1.0));

    ambientColorLoc = gl.getUniformLocation(program, "ambientProduct");
    shininessLoc = gl.getUniformLocation(program, "shininess");

    document.getElementById("loadOBJ").addEventListener("click", function() {
        if (!document.querySelector('#object-input').files.length) {
            console.log("Error: no file selected!");
            return;
        }
        else {
            activeTexture++;
            readTextFromFile(document.querySelector('#object-input').files[0]);
        }

        if (!document.querySelector('#texture-input').files.length) {
            console.log("OBJ will load without texture");
        }
        else {
            readImageFromFile(document.querySelector('#texture-input').files[0]);
        }

        var uploadedOBJ = document.createElement("option");
        uploadedOBJ.value = activeTexture;
        uploadedOBJ.innerHTML = document.querySelector('#object-input').files[0].name;
        document.getElementById("objects").appendChild(uploadedOBJ);

        document.getElementById("object-input").value = "";
        document.getElementById("texture-input").value = "";
        console.log("Object loaded");
    });

    colorCube([1.0, 0.0, 0.0, 1.0]);
    lights.push(
        new Drawable(
            points,
            normals,
            colors,
            textureCoords,
            activeTexture,
            [0.0, 0.0, 0.0],
            vec3(lightPosition1),
            [0.2, 0.2, 0.2],
            program
        )
    );

    colorCube([0.0, 1.0, 0.0, 1.0]);
    lights.push(
        new Drawable(
            points,
            normals,
            colors,
            textureCoords,
            activeTexture,
            [0.0, 0.0, 0.0],
            vec3(lightPosition2),
            [0.2, 0.2, 0.2],
            program
        )
    );

    colorCube([0.0, 0.0, 1.0, 1.0]);
    lights.push(
        new Drawable(
            points,
            normals,
            colors,
            textureCoords,
            activeTexture,
            [0.0, 0.0, 0.0],
            vec3(lightPosition3),
            [0.2, 0.2, 0.2],
            program
        )
    );

    render();
}

function colorCube(color) {
    points = []; normals = []; colors = [];
    textureCoords = [[1, 0], [0, 0], [0, 1], [0, 1], [1, 1], [1, 0], [1, 1], [1, 0], [0, 0], [0, 0], [0, 1], [1, 1], [1, 1], [1, 0], [0, 0], [0, 0], [0, 1], [1, 1], [1, 1], [1, 0], [0, 0], [0, 0], [0, 1], [1, 1], [1, 1], [1, 0], [0, 0], [0, 0], [0, 1], [1, 1], [1, 1], [1, 0], [0, 0], [0, 0], [0, 1], [1, 1]];
    quad( 1, 0, 3, 2, color );
    quad( 2, 3, 7, 6, color );
    quad( 3, 0, 4, 7, color );
    quad( 6, 5, 1, 2, color );
    quad( 4, 5, 6, 7, color );
    quad( 5, 4, 0, 1, color );
}

function quad(a, b, c, d, color) {
    var vertices = [
        vec4(-0.5, -0.5,  0.5, 1.0 ),
        vec4(-0.5,  0.5,  0.5, 1.0 ),
        vec4( 0.5,  0.5,  0.5, 1.0 ),
        vec4( 0.5, -0.5,  0.5, 1.0 ),
        vec4(-0.5, -0.5, -0.5, 1.0 ),
        vec4(-0.5,  0.5, -0.5, 1.0 ),
        vec4( 0.5,  0.5, -0.5, 1.0 ),
        vec4( 0.5, -0.5, -0.5, 1.0 )
    ];

    var t1 = subtract(vertices[a], vertices[b]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = vec3(cross(t2, t1));

    var indices = [ a, b, c, a, c, d ];
    for ( var i = 0; i < indices.length; i++ ) {
        points.push(vertices[indices[i]]);
        normals.push(normal);
        colors.push(color);
    }
}

function updateSliders(obj) {
    // index = obj.value;

    document.getElementById("rotateX").value = shapes[obj.value - 1].rotation[0];
    document.getElementById("rotateY").value = shapes[obj.value - 1].rotation[1];
    document.getElementById("rotateZ").value = shapes[obj.value - 1].rotation[2];

    document.getElementById("moveX").value = shapes[obj.value - 1].translation[0];
    document.getElementById("moveY").value = shapes[obj.value - 1].translation[1];
    document.getElementById("moveZ").value = shapes[obj.value - 1].translation[2];

    document.getElementById("scaleX").value = shapes[obj.value - 1].scaling[0];
    document.getElementById("scaleY").value = shapes[obj.value - 1].scaling[1];
    document.getElementById("scaleZ").value = shapes[obj.value - 1].scaling[2];

    var outputs = document.getElementsByTagName("output");
    for (var i = 0; i < outputs.length; i++) {
        outputs[i].value = outputs[i].previousElementSibling.value;
    }
}

function updateLightSliders(obj) {
    lightIndex = obj.value;

    document.getElementById("moveLightX").value = lights[obj.value].translation[0];
    document.getElementById("moveLightY").value = lights[obj.value].translation[1];
    document.getElementById("moveLightZ").value = lights[obj.value].translation[2];

    document.getElementById("diffuse").value = "#" + ((1 << 24) + ((diffuseProducts[obj.value][0] * 255) << 16) + ((diffuseProducts[obj.value][1] * 255) << 8) + diffuseProducts[obj.value][2] * 255).toString(16).slice(1);
    document.getElementById("specular").value = "#" + ((1 << 24) + ((specularProducts[obj.value][0] * 255) << 16) + ((specularProducts[obj.value][1] * 255) << 8) + specularProducts[obj.value][2] * 255).toString(16).slice(1);

    var outputs = document.getElementsByTagName("output");
    for (var i = 0; i < outputs.length; i++) {
        outputs[i].value = outputs[i].previousElementSibling.value;
    }
}

function readTextFromFile(file) {
    points = []; normals = []; colors = []; textureCoords = [];
    var reader = new FileReader();	

    reader.addEventListener('load', function(e) {
        var text = e.target.result;
        var lines = text.split(/\r?\n/);
        
        var vertices = [vec4(0.0, 0.0, 0.0, 0.0)];
        var texture = [vec2(0.0, 0.0)];
        var normal = [vec3(0.0, 0.0, 0.0)];

        function addVertex(v) {
            var pnts = v.split('/');
            points.push(vertices[pnts[0]]);
            textureCoords.push(texture[pnts[1]] || vec2(0.0, -.0));
            normals.push(normal[pnts[2]]);
            colors.push(vec4(1.0, 1.0, 1.0, 1.0));
        }

        var keywords = {
            v(parts) {
                vertices.push(vec4(parts.map(parseFloat), 1.0));
            },
            vn(parts) {
                normal.push(vec3(parts.map(parseFloat)));
            },
            vt(parts) {
                texture.push(vec2(parts.map(parseFloat)));
                texture[texture.length - 1][1] = 1 -  texture[texture.length - 1][1];
            },
            f(parts) {
                addVertex(parts[0]);
                addVertex(parts[1]);
                addVertex(parts[2]);
            }
        };

        lines.forEach(line => {
            line = line.trim();
            if (line === '' || line.startsWith('#')) {
                return;
            }
            
            var keyword = line.split(/\s+/)[0];
            var parts = line.split(/\s+/).slice(1);
            if (!keywords[keyword]) {
                return;
            }
            keywords[keyword](parts);
        });
        
        var textureID = activeTexture;
        shapes.push(
            new Drawable(
                points,
                normals,
                colors,
                textureCoords,
                textureID,
                [0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0],
                [1.0, 1.0, 1.0],
                program
            )
        );
    });

    reader.addEventListener('error', function() {
        alert('File error happened!');
    });

    reader.readAsText(file);
}

function readImageFromFile(file) {
    var reader = new FileReader();
    reader.addEventListener('load', function(e) {
        var dataRaw = e.target.result;

        gl.activeTexture(gl.TEXTURE0 + activeTexture);
        console.log(gl.TEXTURE0 + activeTexture);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        };

        image.src = dataRaw;
    });

    reader.addEventListener('error', function() {
        alert('File error happened!');
    });

    reader.readAsDataURL(file);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var idx = parseInt(document.getElementById("objects").value);
    if (idx) {
        idx--;
        shapes[idx].rotation[0] = document.getElementById("rotateX").value;
        shapes[idx].rotation[1] = document.getElementById("rotateY").value;
        shapes[idx].rotation[2] = document.getElementById("rotateZ").value;

        shapes[idx].translation[0] = document.getElementById("moveX").value;
        shapes[idx].translation[1] = document.getElementById("moveY").value;
        shapes[idx].translation[2] = document.getElementById("moveZ").value;

        shapes[idx].scaling[0] = document.getElementById("scaleX").value;
        shapes[idx].scaling[1] = document.getElementById("scaleY").value;
        shapes[idx].scaling[2] = document.getElementById("scaleZ").value;
    }

    radius = document.getElementById("radius").value;
    camPhi = document.getElementById("camPhi").value;
    camTheta = document.getElementById("camTheta").value;
    eye = vec3(
        radius * Math.sin(radians(camTheta)) * Math.cos(radians(camPhi)),
        radius * Math.sin(radians(camTheta)) * Math.sin(radians(camPhi)),
        radius * Math.cos(radians(camTheta))
    );

    modelViewMatrix = lookAt(eye, at, up); //eye = [-4, 2, 7]

    near = document.getElementById("zNear").value;
    far = document.getElementById("zFar").value;
    fov = document.getElementById("fov").value;
    aspect = document.getElementById("aspect").value;

    projectionMatrix = perspective(fov, aspect, near, far); //perspective(45, canvas.width / canvas.height, 0.1, 1000.0);
 
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(modelInverseTransposeLoc, false, flatten(transpose(inverse(modelViewMatrix))));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    lights[lightIndex].translation[0] = document.getElementById("moveLightX").value;
    lights[lightIndex].translation[1] = document.getElementById("moveLightY").value;
    lights[lightIndex].translation[2] = document.getElementById("moveLightZ").value;
    lightPosition2 = vec4(lights[lightIndex].translation, 1.0);

    diffuseProducts[lightIndex] = vec4(document.getElementById("diffuse").value.match(/[A-Za-z0-9]{2}/g).map(function(v) {return parseInt(v, 16) / 255}), 1.0);
    specularProducts[lightIndex] = vec4(document.getElementById("specular").value.match(/[A-Za-z0-9]{2}/g).map(function(v) {return parseInt(v, 16) / 255}), 1.0);
    
    gl.uniform4fv(lightPositionLoc1, flatten(vec4(lights[0].translation, 1.0)));
    gl.uniform4fv(diffuseProductLoc1, flatten(diffuseProducts[0]));
    gl.uniform4fv(specularProductLoc1, flatten(specularProducts[0]));
    
    gl.uniform4fv(lightPositionLoc2, flatten(vec4(lights[1].translation, 1.0)));
    gl.uniform4fv(diffuseProductLoc2, flatten(diffuseProducts[1]));
    gl.uniform4fv(specularProductLoc2, flatten(specularProducts[1]));

    gl.uniform4fv(lightPositionLoc3, flatten(vec4(lights[2].translation, 1.0)));
    gl.uniform4fv(diffuseProductLoc3, flatten(diffuseProducts[2]));
    gl.uniform4fv(specularProductLoc3, flatten(specularProducts[2]));

    ambientColor = vec4(document.getElementById("ambient").value.match(/[A-Za-z0-9]{2}/g).map(function(v) {return parseInt(v, 16) / 255}), 1.0);
    shininess = document.getElementById("shininess").value;
    gl.uniform4fv(ambientColorLoc, flatten(ambientColor));
    gl.uniform1f(shininessLoc, shininess);

    lights.forEach(light => light.draw());
    shapes.forEach(shape => shape.draw());

    requestAnimFrame(render);
}