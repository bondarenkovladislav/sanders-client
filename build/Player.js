export class Player {
  constructor(game, options) {
    this.local = true
    let model, colour

    const colours = ['Black', 'Brown', 'White']
    colour = colours[Math.floor(Math.random() * colours.length)]

    if (options === undefined) {
      const people = ['BSanders']
      // model = people[Math.floor(Math.random() * people.length)]
      model = 'BSanders'
    } else if (typeof options === 'object') {
      this.local = false
      this.options = options
      this.id = options.id
      model = options.model
      colour = options.colour
    } else {
      model = options
    }
    this.model = model
    this.colour = colour
    this.game = game
    this.animations = game.animations

    const loader = new THREE.FBXLoader()

    loader.load(`${game.assetsPath}fbx/people/${model}.fbx`, (object) => {
      // loader.load(`${game.assetsPath}fbx/people/Iron_Man_Mark.fbx`, (object) => {
      object.mixer = new THREE.AnimationMixer(object)
      this.root = object
      this.mixer = object.mixer

      object.name = 'Person'
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(
        // `${game.assetsPath}images/${model}_${colour}.png`,
        `${game.assetsPath}fbx/people/lp_100.png`,
        (texture) => {
          object.traverse((child) => {
            if (child.isMesh) {
              child.material.map = texture
            }
          })
        }
      )

      this.object = new THREE.Object3D()
      // this.object.position.set(3122, 0, -173)
      // this.object.rotation.set(0, 2.6, 0)

      this.object.add(object)
      if (this.deleted === undefined) {
        game.scene.add(this.object)
      }

      if (this.local) {
        game.createCameras()
        game.createColliders()
        game.sun.target = game.player.object
        game.animations.Idle = object.animations[0]
        if (this.initSocket !== undefined) {
          this.initSocket()
        } else {
          const geometry = new THREE.BoxGeometry()
          const material = new THREE.MeshBasicMaterial()
          const box = new THREE.Mesh(geometry, material)
          box.name = 'Collider'
          box.position.set(0, 150, 0)
          this.object.add(box)
          this.collider = box
          this.object.userData.id = this.id
          this.object.userData.remotePlayer = true
          const players = game.initialisingPlayers.splice(
            game.initialisingPlayers.indexOf(this),
            1
          )
          game.remotePlayers.push(players[0])
        }
        if (game.animations.Idle !== undefined) {
          this.action = 'Idle'
        }
      } else {
        const players = game.initialisingPlayers.splice(
          game.initialisingPlayers.indexOf(this),
          1
        )
        game.remotePlayers.push(players[0])
      }
    })
  }

  set action(name) {
    if (this.actionName === name) {
      return
    }
    const clip = this.local
      ? this.animations[name]
      : THREE.AnimationClip.parse(
          THREE.AnimationClip.toJSON(this.animations[name])
        )
    const action = this.mixer.clipAction(clip)
    action.time = 0
    this.mixer.stopAllAction()
    this.actionName = name
    this.actionTime = Date.now()

    action.fadeIn(0.5)
    action.play()
  }

  get action() {
    return this.actionName
  }

  update(dt) {
    this.mixer.update(dt)
    if (this.game.remoteData.length > 0) {
      let found = false
      for (const data of this.game.remoteData) {
        if (data.id !== this.id) {
          continue
        }

        this.object.position.set(data.x, data.y, data.z)
        const euler = new THREE.Euler(data.pb, data.heading, data.pb)
        this.object.quaternion.setFromEuler(euler)
        this.action = data.action
        found = true
      }
      if (!found) {
        this.game.removePlayer(this)
      }
    }
  }
}
