import { Player } from './Player.js'

export class PlayerLocal extends Player {
  constructor(game, model) {
    super(game, model)

    const socket = io.connect('https://pacific-scrubland-63536.herokuapp.com/')
    this.socket = socket

    socket.on('setId', (data) => {
      this.id = data.id
    })
    socket.on('remoteData', (data) => {
      game.remoteData = data
    })
    socket.on('deletePlayer', (data) => {
      const players = game.remotePlayers.filter((player) => {
        if (player.id == data.id) {
          return player
        }
      })

      if (players.length > 0) {
        let index = game.remotePlayers.indexOf(players[0])
        if (index != -1) {
          game.remotePlayers.splice(index, 1)
          game.scene.remove(players[0].object)
        } else {
          index = game.initialisingPlayers.indexOf(data.id)
          if (index != -1) {
            const player = game.initialisingPlayers[index]
            player.deleted = true
            game.initialisingPlayers.splice(index, 1)
          }
        }
      }
    })
    socket.on('winner', (data) => {
      this.object.position.set(0, 0, 0)
      if (this.game.marker) {
        this.game.marker.position.set(...data.markerPos)
      }
      if (this.object) {
        this.updateSocket()
      }
      const loseText = document.querySelector('#lose')
      loseText.style.display = 'block'
      setTimeout(() => {
        document.querySelector('#lose').style.display = 'none'
      }, 5000)
    })

    socket.on('markerpos', (data) => {
      if (this.game.marker) {
        this.game.marker.position.set(...data.markerPos)
      }
      if (this.object) {
        this.updateSocket()
      }
    })
  }

  initSocket() {
    this.socket.emit('init', {
      model: this.model,
      colour: this.colour,
      x: this.object.position.x,
      y: this.object.position.y,
      z: this.object.position.z,
      h: this.object.rotation.y,
      pb: this.object.rotation.x,
    })
  }

  updateSocket() {
    if (this.socket !== undefined) {
      this.socket.emit('update', {
        x: this.object.position.x,
        y: this.object.position.y,
        z: this.object.position.z,
        h: this.object.rotation.y,
        pb: this.object.rotation.x,
        action: this.action,
      })
    }
  }

  move(dt) {
    // this.object.translateZ(dt*150);
    // return;

    const pos = this.object.position.clone()
    pos.y += 60
    let dir = new THREE.Vector3()
    this.object.getWorldDirection(dir)
    if (!this.motion) {
      return
    }
    if (this.motion.forward < 0) dir.negate()
    let raycaster = new THREE.Raycaster(pos, dir)
    let blocked = false
    const colliders = this.game.colliders

    if (this.game.marker) {
      const intersect = raycaster.intersectObject(this.game.marker)
      if (intersect.length > 0) {
        if (intersect[0].distance < 50) {
          this.socket.emit('winner')
          this.object.position.set(0, 0, 0)
          const wonText = document.querySelector('#won')
          wonText.style.display = 'block'
          setTimeout(() => {
            document.querySelector('#won').style.display = 'none'
          }, 5000)
        }
      }
    }

    if (colliders !== undefined) {
      const intersect = raycaster.intersectObjects(colliders)
      if (intersect.length > 0) {
        if (intersect[0].distance < 50) blocked = true
      }
    }
    if (!blocked) {
      if (this.motion.forward > 0) {
        const speed = this.action == 'Running' ? 400 : 150
        this.object.translateZ(dt * speed)
      } else {
        this.object.translateZ(-dt * 30)
      }
    }

    if (colliders !== undefined) {
      //cast left
      // dir.set(-1,0,0);
      // dir.applyMatrix4(this.player.object.matrix);
      // dir.normalize();
      raycaster = new THREE.Raycaster(pos, dir)
      //
      // let intersect = raycaster.intersectObjects(colliders);
      // if (intersect.length>0){
      //   if (intersect[0].distance<50) this.player.object.translateX(100-intersect[0].distance);
      // }
      //
      // //cast right
      // dir.set(1,0,0);
      // dir.applyMatrix4(this.player.object.matrix);
      // dir.normalize();
      // raycaster = new THREE.Raycaster(pos, dir);
      //
      // intersect = raycaster.intersectObjects(colliders);
      // if (intersect.length>0){
      //   // if (intersect[0].distance<50) this.player.object.translateX(intersect[0].distance-100);
      // }

      //cast down
      dir.set(0, -1, 0)
      pos.y += 200
      raycaster = new THREE.Raycaster(pos, dir)
      const gravity = 30

      let intersect = raycaster.intersectObjects(colliders)
      if (intersect.length > 0) {
        const targetY = pos.y - intersect[0].distance
        if (targetY > this.object.position.y) {
          //Going up
          this.object.position.y = 0.8 * this.object.position.y + 0.2 * targetY
          this.velocityY = 0
        } else if (targetY < this.object.position.y) {
          //Falling
          if (this.velocityY == undefined) this.velocityY = 0
          this.velocityY += dt * gravity
          this.object.position.y -= this.velocityY
          if (this.object.position.y < targetY) {
            this.velocityY = 0
            this.object.position.y = targetY
          }
        }
      } else if (this.object.position.y > 0) {
        if (this.velocityY == undefined) this.velocityY = 0
        this.velocityY += dt * gravity
        this.object.position.y -= this.velocityY
        if (this.object.position.y < 0) {
          this.velocityY = 0
          this.object.position.y = 0
        }
      }
    }

    this.object.rotateY(this.motion.turn * dt)
    this.updateSocket()
  }
}
