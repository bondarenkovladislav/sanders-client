import { PlayerLocal } from './PlayerLocal.js'
import { Player } from './Player.js'

export class Game {
  constructor() {
    // this.scene = new THREE.Scene();
    // this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    //
    // var renderer = new THREE.WebGLRenderer();
    // renderer.setSize( window.innerWidth, window.innerHeight );
    // document.body.appendChild( renderer.domElement );
    //
    // var geometry = new THREE.BoxGeometry();
    // var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    // var cube = new THREE.Mesh( geometry, material );
    // scene.add( cube );
    //
    // camera.position.z = 5;
    //
    // var animate = function () {
    //   requestAnimationFrame( animate );
    //
    //   cube.rotation.x += 0.01;
    //   cube.rotation.y += 0.01;
    //
    //   renderer.render( scene, camera );
    // };
    //
    // animate();
    //
    this.modes = Object.freeze({
      NONE: Symbol('none'),
      PRELOAD: Symbol('preload'),
      INITIALISING: Symbol('initialising'),
      CREATING_LEVEL: Symbol('creating_level'),
      ACTIVE: Symbol('active'),
      GAMEOVER: Symbol('gameover'),
    })

    this.mode = this.modes.NONE

    this.container
    this.player
    this.cameras
    this.camera
    this.scene
    this.renderer
    this.animations = {}
    this.assetsPath = './assets/'
    // this.controls

    this.remotePlayers = []
    this.remoteColliders = []
    this.initialisingPlayers = []
    this.remoteData = []

    this.messages = {
      text: ['Welcome'],
      index: 0,
    }

    this.container = document.createElement('div')
    this.container.style.height = '100%'
    document.body.appendChild(this.container)

    this.anims = ['Happy Walk', 'Running', 'Walking Backwards', 'Drunk Turn']

    this.mode = this.modes.PRELOAD

    this.clock = new THREE.Clock()

    this.totalTime = 0

    this.init()
    // this.animate()
    // this.animate2()
    // this.preloader = new Preloader(options)

    window.onError = (error) => {
      console.error(JSON.stringify(error))
    }
  }

  animate2() {
    requestAnimationFrame(() => this.animate2())
    const deltaTime = this.clock.getDelta()
    this.totalTime += deltaTime
    this.update()
    this.render()
  }

  update() {
    // update artoolkit on every frame
    if (this.arToolkitSource.ready !== false)
      this.arToolkitContext.update(this.arToolkitSource.domElement)
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  init() {
    // this.mode = this.modes.INITIALISING
    // this.camera = new THREE.PerspectiveCamera(
    //   60,
    //   window.innerWidth / window.innerHeight,
    //   10,
    //   200000
    // )



    this.scene = new THREE.Scene()
    // this.scene.background = new THREE.Color(0xa0a0a0)
    // this.scene.fog = new THREE.Fog(0xa0a0a0, 700, 1800)

    this.dummy = new THREE.Object3D()
    this.dummy.scale.set(0.001, 0.001, 0.001)
    this.scene.add(this.dummy)


    this.camera = new THREE.Camera();
    // this.camera.position.set(0, 0, 700 );
    // this.camera.position.set(0, 0, 100 );
    this.scene.add(this.camera);

    const ambient = new THREE.AmbientLight(0xaaaaaa)
    this.dummy.add(ambient)

    let light = new THREE.DirectionalLight(0xaaaaaa)
    light.position.set(30, 100, 40)
    light.target.position.set(0, 0, 0)
    light.castShadow = true
    const lightSize = 500
    light.shadow.camera.near = 1
    light.shadow.camera.far = 500
    light.shadow.camera.left = light.shadow.camera.bottom = -lightSize
    light.shadow.camera.right = light.shadow.camera.top = lightSize

    light.shadow.bias = 0.0039
    light.shadow.mapSize.width = 1024
    light.shadow.mapSize.height = 1024

    this.sun = light
    this.dummy.add(light)

    const loader = new THREE.FBXLoader()

    // this.player = new PlayerLocal(this)
    // this.generateMarker(loader)
    // this.scene.add(this.player.object)

    // this.joystick = new JoyStick({
    //   onMove: this.playerControl,
    //   game: this,
    // })

    this.loadNextAnim(loader)
    // this.loadEnvironment(loader)

    window.addEventListener(
      'resize',
      () => {
        this.onWindowResize()
      },
      false
    )

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setClearColor(new THREE.Color('lightgrey'), 0)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.container.appendChild(this.renderer.domElement)

    this.arToolkitSource = new THREEx.ArToolkitSource({
      sourceType: 'webcam',
    })

    const onResize = () => {
      this.arToolkitSource.onResize()
      this.arToolkitSource.copySizeTo(this.renderer.domElement)
      if (this.arToolkitContext.arController !== null) {
        this.arToolkitSource.copySizeTo(this.arToolkitContext.arController.canvas)
      }
    }

    this.arToolkitSource.init(() => {
      onResize()
    })

    window.addEventListener('resize', function () {
      onResize()
    })

    // create atToolkitContext
    this.arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: 'data/camera_para.dat',
      detectionMode: 'mono',
    })

    // copy projection matrix to camera when initialization complete
    this.arToolkitContext.init(() => {
      this.camera.projectionMatrix.copy(
        this.arToolkitContext.getProjectionMatrix()
      )
    })

    ////////////////////////////////////////////////////////////
    // setup markerRoots
    ////////////////////////////////////////////////////////////

    // build markerControls
    this.markerRoot = new THREE.Group()
    this.dummy.add(this.markerRoot)
    let markerControls1 = new THREEx.ArMarkerControls(
      this.arToolkitContext,
      this.markerRoot,
      {
        size: 150,
        type: 'pattern',
        patternUrl: 'data/hiro.patt',
      }
    )

    let geometry1 = new THREE.CubeGeometry(1, 1, 1)
    let material1 = new THREE.MeshNormalMaterial({
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })

    const mesh1 = new THREE.Mesh(geometry1, material1)
    mesh1.position.y = 0.5

    this.markerRoot.add(mesh1)



    const mesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(10000, 10000),
      // new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false, side: THREE.DoubleSide })
      new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false, })
    )
    mesh.rotation.x = Math.PI / 2
    mesh.receiveShadow = true
    this.markerRoot.add(mesh)
    //
    const grid = new THREE.GridHelper(10000, 40, 0x00000, 0x00000)
    // grid.material.opacity = 0.2
    // grid.material.transparent = true
    this.markerRoot.add(grid)

    // this.controls = new THREE.OrbitControls(
    //   this.camera,
    //   this.renderer.domElement
    // )
    // this.controls.target.set(0, 150, 0)
    // const loader1 = new THREE.TextureLoader()
    // const texture = loader1.load('../assets/big.jpg', () => {
    //   const rt = new THREE.WebGLCubeRenderTarget(texture.image.height)
    //   rt.fromEquirectangularTexture(this.renderer, texture)
    //   this.scene.background = rt
    // })
    // this.controls.update()


    // const loader = new THREE.FBXLoader()

    this.player = new PlayerLocal(this)
    // // this.generateMarker(loader)
    // this.markerRoot.add(this.player.object)

    this.joystick = new JoyStick({
      onMove: this.playerControl,
      game: this,
    })

    // this.loadNextAnim(loader)
  }

  animate() {
    const dt = this.clock.getDelta()
    requestAnimationFrame(() => {
      this.animate()
    })

    this.totalTime += dt
    this.updateRemotePlayers(dt)

    if (this.player.mixer != undefined && this.mode == this.modes.ACTIVE) {
      this.player.mixer.update(dt)
    }

    if (this.player.action === 'Happy Walk') {
      const elapsedTime = Date.now() - this.player.actionTime
      if (elapsedTime > 1000 && this.player.motion.forward > 0) {
        this.player.action = 'Running'
      }
    }

    if (this.player.motion !== undefined) {
      this.player.move(dt)
    }

    // if (
    //   this.player.cameras != undefined &&
    //   this.player.cameras.active != undefined &&
    //   this.player !== undefined &&
    //   this.player.object !== undefined
    // ) {
    //   this.camera.position.lerp(
    //     this.player.cameras.active.getWorldPosition(new THREE.Vector3()),
    //     0.05
    //   )
    //   const pos = this.player.object.position.clone()
    //   pos.y += 200
    //   this.camera.lookAt(pos)
    // }

    if (this.sun != undefined && this.player && this.player.object) {
      this.sun.position.x = this.player.object.position.x
      this.sun.position.y = this.player.object.position.y + 200
      this.sun.position.z = this.player.object.position.z + 100
      this.sun.target = this.player.object
    }

    this.update()

    this.renderer.render(this.scene, this.camera)
  }

  loadEnvironment(loader) {
    loader.load(`${this.assetsPath}fbx/Street.fbx`, (object) => {
      this.environment = object
      this.colliders = []
      this.scene.add(object)
      object.scale.set(10, 10, 10)
      object.traverse((child) => {
        if (child.isMesh) {
          if (child.name.startsWith('proxy')) {
            this.colliders.push(child)
            child.material.visible = false
          } else {
            child.castShadow = true
            child.receiveShadow = true
          }
        }
      })

      console.log(this.colliders)

      // const tloader = new Three.CubeTextureLoader()
      // tloader.setPath(``)
      // cos
    })
  }

  loadNextAnim(loader) {
    let anim = this.anims.pop()
    loader.load(`${this.assetsPath}fbx/anims/${anim}.fbx`, (object) => {
      this.animations[anim] = object.animations[0]
      if (this.anims.length > 0) {
        this.loadNextAnim(loader)
      } else {
        // this.createCameras()
        // this.createColliders()
        delete this.anims
        this.player.action = 'Idle'
        this.mode = this.modes.ACTIVE
        this.animate()
      }
    })
  }

  playerControl(forward, turn) {
    turn = -turn
    if (forward > 0.3) {
      if (
        this.player.action != 'Happy Walk' &&
        this.player.action != 'Running'
      ) {
        this.player.action = 'Happy Walk'
      }
    } else if (forward < -0.3) {
      if (this.player.action != 'Walking Backwards') {
        this.player.action = 'Walking Backwards'
      }
    } else {
      forward = 0
      if (Math.abs(turn) > 0.1) {
        if (this.player.action != 'Drunk Turn') {
          this.player.action = 'Drunk Turn'
        }
      } else if (this.player.action != 'Idle') {
        this.player.action = 'Idle'
      }
    }
    if (Math.abs(forward) === 0 && Math.abs(turn) === 0) {
      delete this.player.motion
      this.player.action = 'Idle'
      this.player.updateSocket()
    } else {
      this.player.motion = { forward, turn }
    }
  }

  set activeCamera(object) {
    this.player.cameras.active = object
  }

  get activeCamera() {
    return this.player.cameras.active
  }

  createCameras() {
    const offset = new THREE.Vector3(0, 80, 0)
    const front = new THREE.Object3D()
    front.position.set(112, 100, 600)
    front.parent = this.player.object
    const back = new THREE.Object3D()
    // back.position.set(0, 300, -600)
    back.position.set(0, 200, -500)
    back.parent = this.player.object
    const wide = new THREE.Object3D()
    wide.position.set(178, 139, 1665)
    wide.parent = this.player.object
    const overhead = new THREE.Object3D()
    overhead.position.set(0, 400, 0)
    overhead.parent = this.player.object
    const collect = new THREE.Object3D()
    collect.position.set(40, 82, 94)
    collect.parent = this.player.object
    this.player.cameras = { front, back, wide, overhead, collect }
    this.activeCamera = this.player.cameras.back
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  generateMarker() {
    const geometry = new THREE.SphereGeometry(100, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      color: 0x24ed27,
      metalness: 0.7,
    })

    const mesh = new THREE.Mesh(geometry, material)
    this.marker = mesh
    this.scene.add(mesh)
  }

  createColliders() {
    return
    const geometry = new THREE.BoxGeometry(500, 400, 500)
    const material = new THREE.MeshBasicMaterial({
      // color: 0x5d5e5e,
      color: 0xffffff,
      // wireframe: true,
    })
    // const material = new THREE.MeshBasicMaterial({color:	0x000000, wireframe:true});

    this.colliders = []

    for (let x = -5000; x < 5000; x += 1000) {
      for (let z = -5000; z < 5000; z += 1000) {
        if (x == 0 && z == 0) continue
        const box = new THREE.Mesh(geometry, material)
        box.position.set(x, 200, z)
        this.markerRoot.add(box)
        this.colliders.push(box)
      }
    }

    const geometry2 = new THREE.BoxGeometry(1000, 40, 1000)
    const stage = new THREE.Mesh(geometry2, material)
    stage.position.set(0, 20, 0)
    this.colliders.push(stage)
    this.markerRoot.add(stage)
  }

  updateRemotePlayers(dt) {
    if (
      this.remoteData === undefined ||
      this.remoteData.length === 0 ||
      this.player === undefined ||
      this.player.id === undefined
    ) {
      return
    }

    const newPlayers = []
    const remotePlayers = []
    const remoteColliders = []

    this.remoteData.forEach((data) => {
      if (this.player.id != data.id) {
        let iplayer
        this.initialisingPlayers.forEach((player) => {
          if (player.id === data.id) {
            iplayer = player
          }
        })

        if (iplayer === undefined) {
          let rplayer
          this.remotePlayers.forEach((player) => {
            if (player.id === data.id) {
              rplayer = player
            }
          })
          if (rplayer === undefined) {
            game.initialisingPlayers.push(new Player(game, data))
          } else {
            remotePlayers.push(rplayer)
            remoteColliders.push(rplayer.collider)
          }
        }
      }
    })

    this.scene.children.forEach((object) => {
      if (
        object.userData.remotePlayer &&
        this.getRemotePlayerById(object.userData.id) == undefined
      ) {
        this.scene.remove(object)
      }
    })

    this.remotePlayers = remotePlayers
    this.remoteColliders = remoteColliders
    this.remotePlayers.forEach((player) => {
      player.update(dt)
    })
  }

  getRemotePlayerById(id) {
    if (this.remotePlayers === undefined || this.remotePlayers.length == 0) {
      return
    }
    const players = this.remotePlayers.filter((player) => {
      if (player.id === id) {
        return true
      }
    })
    if (players.length == 0) {
      return
    }
    return players[0]
  }
}
