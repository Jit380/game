extends CharacterBody3D
var game: Node3D
var boss := false
var hp := 75.0
var frozen := 0.0
var cooldown := 2.5
var windup := 0.0
var strike := Vector3.ZERO
var warning: MeshInstance3D
var enraged := false
var model: Node3D
var animation: AnimationPlayer

func _ready() -> void:
 var shape := CollisionShape3D.new()
 var capsule := CapsuleShape3D.new()
 capsule.radius = .5 if boss else .3
 capsule.height = 2.8 if boss else 1.8
 shape.shape = capsule
 shape.position.y = capsule.height / 2
 add_child(shape)
 model = preload("res://assets/ultimateman.glb").instantiate()
 model.scale = Vector3.ONE * (1.5 if boss else 1)
 add_child(model)
 animation = model.find_child("AnimationPlayer",true,false) as AnimationPlayer
 var metal := StandardMaterial3D.new()
 metal.albedo_color = Color("351f39") if boss else Color("53606c")
 metal.metallic = .6
 metal.roughness = .35
 for node in model.find_children("*","MeshInstance3D",true,false):
  node.material_override = metal
 if boss:
  for side in [-1,1]:
   var horn := MeshInstance3D.new()
   var cone := CylinderMesh.new()
   cone.top_radius=0
   cone.bottom_radius=.16
   cone.height=.7
   horn.mesh=cone
   horn.position=Vector3(side*.18,1.91,0)
   horn.rotation.z=-side*.25
   model.add_child(horn)
  var core := MeshInstance3D.new()
  var sphere := SphereMesh.new()
  sphere.radius=.16
  sphere.height=.32
  core.mesh=sphere
  core.position=Vector3(0,1.3,.14)
  var glow := StandardMaterial3D.new()
  glow.albedo_color=Color("ff5c79")
  glow.emission_enabled=true
  glow.emission=Color("ff3456")
  core.material_override=glow
  model.add_child(core)
 if animation:
  for clip in animation.get_animation_list():
   animation.get_animation(clip).loop_mode=Animation.LOOP_LINEAR
   if "Run" in clip: animation.play(clip)

func hit(damage: float, power: int) -> void:
 hp-=damage
 if power==2: frozen=.5 if boss else 2.0
 if hp<=0:
  game.enemy_down(self)
  queue_free()

func _physics_process(delta: float) -> void:
 if not game.playing: return
 frozen=maxf(0,frozen-delta)
 var target: Vector3=game.hero.global_position
 var victim: Node3D=null
 if not boss and game.stage==3 and global_position.distance_to(target)>12:
  victim=game.witnesses[0]
  target=victim.global_position
 var direction: Vector3=target-global_position
 direction.y=0
 velocity=direction.normalized() * (5.5 if boss else 4)
 if frozen>0: velocity.x=0;velocity.z=0
 velocity.y=-8
 if boss:
  if hp<225 and not enraged:
   enraged=true
   game.say("THE WARDEN","Enough. Let the dragon burn.")
  cooldown-=delta
  if cooldown<=0 and windup<=0:
   strike=target
   windup=1.0
   warning=game.ring(strike,7.0 if enraged else 5.0,Color("ff537b"),true)
   game.notify("AURA STRIKE — DODGE OR JUMP" if enraged else "GROUND SLAM — LEAVE THE RING")
  if windup>0:
   velocity.x=0;velocity.z=0
   windup-=delta
   if windup<=0:
    var radius := 7.0 if enraged else 5.0
    if Vector2(target.x-strike.x,target.z-strike.z).length()<radius and target.y<strike.y+2.5 and game.hero.dodge_time<=0:
     game.damage(35 if enraged else 25)
    if is_instance_valid(warning):warning.queue_free()
    game.ring(strike,radius,Color("ffb171"))
    game.tone(80,.25)
    cooldown=2.4 if enraged else 3.8
  game.boss_bar.value=hp
  game.boss_name.text="THE WARDEN · PHASE II" if enraged else "THE WARDEN · PHASE I"
 if direction.length()>2.0:move_and_slide()
 if direction.length()<2 and frozen<=0:
  if victim:game.witness_hp-=10*delta
  elif game.hero.dodge_time<=0:game.damage(12*delta)
 model.rotation.y=atan2(direction.x,direction.z)

func _exit_tree() -> void:
 if is_instance_valid(warning):warning.queue_free()
