import { PlayerLocal } from './PlayerLocal.js'
import { Player } from './Player.js'
import {JoyStick} from "./libs/toon3d.js";

export class Game {
  constructor() {
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

    this.init()
    // this.preloader = new Preloader(options)

    window.onError = (error) => {
      console.error(JSON.stringify(error))
    }
  }

  init() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      10,
      200000
    )

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xa0a0a0)
    this.scene.fog = new THREE.Fog(0x709bdc, 100, 5800)

    const ambient = new THREE.AmbientLight(0xaaaaaa)
    this.scene.add(ambient)

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
    this.scene.add(light)

    const grassMaterial  = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
    const grassTexture = new THREE.TextureLoader().load( `${this.assetsPath}large_thumbnail.jpg`, (texture) => {
      grassMaterial.map = texture
      grassMaterial.needsUpdate = true;
    });

    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set( 5, 10 );
    const mesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(10000, 10000),
      // new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false, side: THREE.DoubleSide })
      // new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
      grassMaterial
    )
    mesh.rotation.x = Math.PI / 2
    mesh.receiveShadow = true
    this.scene.add(mesh)
    // const grid = new THREE.GridHelper(10000, 40, 0x00000, 0x00000)
    // grid.material.opacity = 0.2
    // grid.material.transparent = true
    // this.scene.add(grid)

    const loader = new THREE.FBXLoader()

    this.player = new PlayerLocal(this)
    this.generateMarker(loader)
    // this.scene.add(this.player.object)

    this.joystick = new JoyStick({
      onMove: this.playerControl,
      game: this,
    })

    // loader.load(`${this.assetsPath}fbx/people/BSanders.FBX`, function (object) {
    //   object.mixer = new THREE.AnimationMixer(object)
    //   game.player.mixer = object.mixer
    //   game.player.root = object.mixer.getRoot()
    //
    //   object.name = 'BSanders'
    //
    //   object.traverse(function (child) {
    //     if (child.isMesh) {
    //       child.castShadow = true
    //       child.receiveShadow = false
    //     }
    //   })
    //
    //   const tLoader = new THREE.TextureLoader()
    //   tLoader.load(`${game.assetsPath}fbx/people/lp_100.png`, function (
    //     texture
    //   ) {
    //     object.traverse((child) => {
    //       if (child.isMesh) {
    //         child.material.map = texture
    //       }
    //     })
    //   })

    // let texture = new THREE.TextureLoader().load( 'https://mma.prnewswire.com/media/1022760/Geenee___Logo.jpg?p=facebook' );
    // let texture = new THREE.TextureLoader().load( 'https://www.finsmes.com/wp-content/uploads/2019/11/geenee.png' );
    // let texture = new THREE.TextureLoader().load( '../assets/geenee.png' );
    // let logoMaterial= new THREE.MeshBasicMaterial( { map: texture ,opacity: 0.8, transparent: true } )
    // let logoPlane= new THREE.PlaneGeometry(1200,600,1,1)
    // let logo = new THREE.Mesh(logoPlane, logoMaterial)
    //
    // // flowe
    //
    // game.scene.add(logo)
    // logo.position.set(0, 100, 600)
    // logo.rotateY(3.14)

    //
    // game.scene.add(object)

    // object.rotateY(3.14)

    // game.player.object = object
    // game.player.mixer.clipAction(object.animations[0]).play()
    // game.animations.Idle = object.animations[0]

    this.loadNextAnim(loader)
    // this.loadEnvironment(loader)

    window.addEventListener(
      'resize',
      () => {
        this.onWindowResize()
      },
      false
    )

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.container.appendChild(this.renderer.domElement)

    this.renderer.autoClear = false;
    this.composer = new THREE.EffectComposer(this.renderer);
    var sunRenderModel = new THREE.RenderPass(this.scene, this.camera);

    var bloomPass = new THREE.BloomBlendPass(
      2.0, // the amount of blur
      1.0, // interpolation(0.0 ~ 1.0) original image and bloomed image
      new THREE.Vector2(1024, 1024) // image resolution
    );
    bloomPass.renderToScreen = true;

    var effectCopy = new THREE.ShaderPass(THREE.CopyShader);
    effectCopy.renderToScreen = true;
    this.composer.addPass(sunRenderModel);
    this.composer.addPass( bloomPass );
    this.composer.addPass(effectCopy);


    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    )
    this.controls.target.set(0, 150, 0)
    // this.controls.enableDamping = true;
    // this.controls.dampingFactor = 0.25;
    // this.controls.enableZoom = true;
    // this.controls.autoRotate = true;
    const loader1 = new THREE.TextureLoader()
    const texture = loader1.load('./assets/big.jpg', () => {
      const rt = new THREE.WebGLCubeRenderTarget(texture.image.height)
      rt.fromEquirectangularTexture(this.renderer, texture)
      this.scene.background = rt
    })
    this.controls.update()
  }

  animate() {
    const dt = this.clock.getDelta()
    requestAnimationFrame(() => {
      this.animate()
    })

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

    if (
      this.player.cameras != undefined &&
      this.player.cameras.active != undefined &&
      this.player !== undefined &&
      this.player.object !== undefined
    ) {
      this.camera.position.lerp(
        this.player.cameras.active.getWorldPosition(new THREE.Vector3()),
        0.05
      )
      const pos = this.player.object.position.clone()
      pos.y += 200
      this.camera.lookAt(pos)
    }

    if (this.sun != undefined && this.player && this.player.object) {
      this.sun.position.x = this.player.object.position.x
      this.sun.position.y = this.player.object.position.y + 200
      this.sun.position.z = this.player.object.position.z + 100
      this.sun.target = this.player.object
    }

    // this.renderer.render(this.scene, this.camera)
    this.composer.render(this.scene, this.camera);
  }

  loadEnvironment (loader) {
    loader.load(`${this.assetsPath}fbx/Street.fbx`, object => {
      this.environment = object
      this.colliders = []
      this.scene.add(object)
      object.scale.set(10,10,10)
      object.traverse(child => {
        if(child.isMesh) {
          if(child.name.startsWith('proxy')) {
            this.colliders.push(child)
            child.material.visible = false
          } else {
            child.castShadow = true
            child.receiveShadow = true
          }
        }
      })
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

  get activeCamera () {
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

  generateMarker () {
    const geometry = new THREE.SphereGeometry(100, 32, 32)
    const material = new THREE.MeshStandardMaterial({
      color: 0x24ed27,
      metalness: 0.7
    })

    const mesh = new THREE.Mesh(geometry, material)
    this.marker = mesh
    this.scene.add(mesh)
  }

  createColliders() {
    const geometry = new THREE.BoxGeometry(500, 400, 500)

    const material  = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, transparent: true, opacity: 0.6});
    const texture = new THREE.TextureLoader().load( `${this.assetsPath}box.jpg`, (texture) => {
      material.map = texture
      material.needsUpdate = true;
    });
    // const material = new THREE.MeshBasicMaterial({
    //   color: 0x5d5e5e,
    //   wireframe: true,

    this.colliders = []

    for (let x = -5000; x < 5000; x += 1000) {
      for (let z = -5000; z < 5000; z += 1000) {
        if (x == 0 && z == 0) continue
        const box = new THREE.Mesh(geometry, material)
        box.position.set(x, 210, z)
        this.scene.add(box)
        this.colliders.push(box)
      }
    }

    const geometry2 = new THREE.BoxGeometry(1000, 40, 1000)
    const stage = new THREE.Mesh(geometry2, material)
    stage.position.set(0, 20, 0)
    this.colliders.push(stage)
    this.scene.add(stage)
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
            this.initialisingPlayers.push(new Player(game, data))
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
