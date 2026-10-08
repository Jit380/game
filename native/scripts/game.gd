extends Node3D

const Hero = preload("res://scripts/hero.gd")
const Enemy = preload("res://scripts/enemy.gd")
var hero: CharacterBody3D
var camera: Camera3D
var buildings: Array[Dictionary] = []
var enemies: Array[CharacterBody3D] = []
var witnesses: Array[Node3D] = []
var cars: Array[Node3D] = []
var shots: Array[Dictionary] = []
var stage := 0
var playing := false
var hp := 100.0
var aura := 0.0
var witness_hp := 100.0
var ambush_spawned := false
var menu_story: Label
var yaw := 0.0
var pitch := .15
var shot_cooldown := 0.0
var leap_cooldown := 0.0
var power := 0
var elapsed := 0.0
var courier: Node3D
var courier_path := [Vector3(0,0,-192),Vector3(64,0,-192),Vector3(64,0,-64),Vector3(0,0,-64)]
var courier_leg := 0
var marker: MeshInstance3D
var transmitter: Node3D
var ui: CanvasLayer
var menu: Control
var objective: Label
var dialogue: Label
var health_bar: ProgressBar
var aura_bar: ProgressBar
var boss_bar: ProgressBar
var boss_name: Label
var status: Label
var message: Label
var notice_time := 0.0
var dialogue_time := 0.0
var targets: Array[Vector3] = []
var mission_names := ["Answer the distress call","Investigate the robbery","Catch the fleeing courier","Protect the witnesses","Disable the rooftop transmitter","Return to East Ninth","Defeat the Warden"]
var rng := RandomNumberGenerator.new()
var static_batches: Dictionary = {}
var batch_materials: Dictionary = {}

func _ready() -> void:
 rng.seed=7349
 setup_input()
 setup_lighting()
 build_city()
 hero=Hero.new()
 hero.position=Vector3(0,.05,18)
 add_child(hero)
 camera=Camera3D.new()
 camera.current=true
 camera.far=800
 camera.fov=64
 add_child(camera)
 hero.camera=camera
 setup_story()
 setup_ui()
 flush_batches()

func setup_input() -> void:
 var binds := {"forward":KEY_W,"back":KEY_S,"left":KEY_A,"right":KEY_D,"jump":KEY_SPACE,"sprint":KEY_SHIFT,"climb":KEY_E,"leap":KEY_Q,"dodge":KEY_C,"attack":KEY_F,"aura":KEY_R}
 for action in binds:
  InputMap.add_action(action)
  var key:=InputEventKey.new()
  key.physical_keycode=binds[action]
  InputMap.action_add_event(action,key)
 var click:=InputEventMouseButton.new()
 click.button_index=MOUSE_BUTTON_LEFT
 InputMap.action_add_event("attack",click)

func material(color: String, glow := false) -> StandardMaterial3D:
 var m:=StandardMaterial3D.new()
 m.albedo_color=Color(color)
 m.roughness=.7
 if glow:
  m.emission_enabled=true
  m.emission=Color(color)
 return m

func block(pos: Vector3, size: Vector3, mat: Material, solid := false) -> void:
 var key:=mat.get_instance_id()
 if not static_batches.has(key):
  static_batches[key]=[]
  batch_materials[key]=mat
 static_batches[key].append(Transform3D(Basis.from_scale(size),pos))
 if solid:
  var body:=StaticBody3D.new()
  var collision:=CollisionShape3D.new()
  var shape:=BoxShape3D.new()
  shape.size=size
  collision.shape=shape
  body.position=pos
  body.add_child(collision)
  add_child(body)

func flush_batches() -> void:
 for key in static_batches:
  var instance:=MultiMeshInstance3D.new()
  var batch:=MultiMesh.new()
  batch.transform_format=MultiMesh.TRANSFORM_3D
  var cube:=BoxMesh.new()
  cube.size=Vector3.ONE
  cube.material=batch_materials[key]
  batch.mesh=cube
  batch.instance_count=static_batches[key].size()
  for i in batch.instance_count:batch.set_instance_transform(i,static_batches[key][i])
  instance.multimesh=batch
  add_child(instance)
 static_batches.clear()

func setup_lighting() -> void:
 var environment:=WorldEnvironment.new()
 var env:=Environment.new()
 env.background_mode=Environment.BG_SKY
 var sky:=Sky.new()
 var sky_mat:=ProceduralSkyMaterial.new()
 sky_mat.sky_top_color=Color("4b7398")
 sky_mat.sky_horizon_color=Color("e3c3a5")
 sky_mat.ground_horizon_color=Color("e3c3a5")
 sky_mat.ground_bottom_color=Color("364d60")
 sky.sky_material=sky_mat
 env.sky=sky
 env.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR
 env.ambient_light_color=Color("b7cddd")
 env.ambient_light_energy=.35
 env.tonemap_mode=Environment.TONE_MAPPER_FILMIC
 env.fog_enabled=true
 env.fog_light_color=Color("b9b5ac")
 env.fog_density=.002
 environment.environment=env
 add_child(environment)
 var sunlight:=DirectionalLight3D.new()
 sunlight.light_color=Color("ffd4aa")
 sunlight.light_energy=1.0
 sunlight.shadow_enabled=true
 sunlight.directional_shadow_max_distance=120
 sunlight.rotation_degrees=Vector3(-32,-28,0)
 add_child(sunlight)

func build_city() -> void:
 var road:=material("343b43")
 var pavement:=material("939ba1")
 var roof:=material("3c4650")
 var paint:=material("d8ceac")
 block(Vector3(0,-.5,0),Vector3(520,1,520),road,true)
 for gx in range(-3,4):
  for gz in range(-3,4):
   var pos:=Vector3(gx*64+32,0,gz*64+32)
   var h:=rng.randf_range(18,60)
   if gx==1 and gz==-2:h=26
   var b: Dictionary={"x":pos.x,"z":pos.z,"h":h,"w":42.0,"d":42.0}
   buildings.append(b)
   block(pos+Vector3(0,.18,0),Vector3(49,.35,49),pavement)
   var facade:=ShaderMaterial.new()
   facade.shader=preload("res://assets/facade.gdshader")
   facade.set_shader_parameter("base_color",Color.from_hsv(rng.randf_range(.04,.1),rng.randf_range(.04,.23),rng.randf_range(.32,.57)))
   block(pos+Vector3.UP*h/2,Vector3(42,h,42),facade,true)
   block(pos+Vector3.UP*(h+.15),Vector3(43,.3,43),roof)
   for side in [-1,1]:
    block(pos+Vector3(side*21.5,h+.7,0),Vector3(.3,1.3,43),roof)
    block(pos+Vector3(0,h+.7,side*21.5),Vector3(43,1.3,.3),roof)
   block(pos+Vector3(10,h+1.5,10),Vector3(4,3,5),roof)
   if gx%2==0:
    cylinder(pos+Vector3(-10,h+4,-9),2,5,material("735a43"))
    for side in [-1,1]:block(pos+Vector3(-10+side*1.7,h+1,-9),Vector3(.2,2,.2),roof)
   for side in [-1,1]:block(pos+Vector3(side*15,3.8,-21.5),Vector3(8,.5,2),material("315652"))
 for a in range(-192,193,64):
  for b in range(-230,230,12):
   block(Vector3(a,.015,b),Vector3(.2,.03,4),paint)
   block(Vector3(b,.02,a),Vector3(4,.03,.2),paint)
  for b in range(-192,193,64):
   for stripe in range(-3,4):
    block(Vector3(a+stripe*1.5,.025,b+10),Vector3(.9,.03,7),paint)
 for i in range(20):
  var car:=Node3D.new()
  car.position=Vector3((i%7-3)*64+4,rng.randf_range(0,.05),rng.randf_range(-230,230))
  add_child(car)
  mesh_box(car,Vector3(0,.6,0),Vector3(1.8,.75,4),material("d8a743") if i%3==0 else material("3c515d"))
  mesh_box(car,Vector3(0,1.2,-.1),Vector3(1.6,.65,2),material("192d3b"))
  for side in [-1,1]:
   for end in [-1,1]:
    var wheel:=MeshInstance3D.new()
    var torus:=TorusMesh.new()
    torus.inner_radius=.16
    torus.outer_radius=.32
    wheel.mesh=torus
    wheel.material_override=material("171c20")
    wheel.rotation.z=PI/2
    wheel.position=Vector3(side*.9,.35,end*1.3)
    car.add_child(wheel)
  cars.append(car)

func cylinder(pos: Vector3,radius: float,height: float,m: Material) -> void:
 var node:=MeshInstance3D.new()
 var mesh:=CylinderMesh.new()
 mesh.top_radius=radius
 mesh.bottom_radius=radius
 mesh.height=height
 node.mesh=mesh
 node.material_override=m
 node.position=pos
 add_child(node)

func mesh_box(parent: Node3D,pos: Vector3,size: Vector3,m: Material) -> MeshInstance3D:
 var node:=MeshInstance3D.new()
 var box:=BoxMesh.new()
 box.size=size
 node.mesh=box
 node.material_override=m
 node.position=pos
 parent.add_child(node)
 return node

func dress_character(model: Node3D, suit_color: Color, hair_color: Color) -> void:
 for node in model.find_children("*","MeshInstance3D",true,false):
  for surface in node.mesh.get_surface_count():
   var m=node.mesh.surface_get_material(surface)
   if m is StandardMaterial3D:
    var recolored=m.duplicate()
    if "suit" in m.resource_name.to_lower() or "armor" in m.resource_name.to_lower():recolored.albedo_color=suit_color
    if "hair" in m.resource_name.to_lower():recolored.albedo_color=hair_color
    node.set_surface_override_material(surface,recolored)

func setup_story() -> void:
 var rooftop:=Vector3(96,27,-96)
 targets=[Vector3(0,0,-30),Vector3(0,0,-105),Vector3(0,0,-120),Vector3(64,0,-64),rooftop,Vector3(0,0,18),Vector3(0,0,18)]
 marker=ring(targets[0],3,Color("ffcd82"),true)
 courier=preload("res://assets/ultimateman.glb").instantiate()
 courier.position=Vector3(0,0,-120)
 dress_character(courier,Color("5c4240"),Color("492e24"))
 courier.visible=false
 add_child(courier)
 for i in range(3):
  var witness:Node3D=preload("res://assets/ultimateman.glb").instantiate()
  witness.position=Vector3(62+i*2,0,-69)
  dress_character(witness,[Color("576b83"),Color("786957"),Color("557966")][i],Color("403228"))
  witness.visible=false
  add_child(witness)
  witnesses.append(witness)
 transmitter=Node3D.new()
 transmitter.position=rooftop
 add_child(transmitter)
 mesh_box(transmitter,Vector3(0,1,0),Vector3(2,2,2),material("394756"))
 cylinder(rooftop+Vector3(0,3,0),.18,5,material("ae9562",true))

func ring(pos: Vector3,radius: float,color: Color,persistent := false) -> MeshInstance3D:
 var node:=MeshInstance3D.new()
 var torus:=TorusMesh.new()
 torus.inner_radius=radius-.07
 torus.outer_radius=radius+.07
 torus.rings=40
 node.mesh=torus
 var m:=StandardMaterial3D.new()
 m.albedo_color=color
 m.emission_enabled=true
 m.emission=color
 node.material_override=m
 node.position=pos+Vector3.UP*.1
 add_child(node)
 if not persistent:
  var tween:=create_tween()
  tween.tween_property(node,"scale",Vector3.ONE*1.7,.45)
  tween.tween_callback(node.queue_free)
 return node

func label(parent: Node,text: String,size: int,pos: Vector2,width: float=600) -> Label:
 var l:=Label.new()
 l.text=text
 l.add_theme_font_size_override("font_size",size)
 l.add_theme_color_override("font_color",Color("edf3f2"))
 l.add_theme_color_override("font_shadow_color",Color("151c25"))
 l.add_theme_constant_override("shadow_offset_x",1)
 l.add_theme_constant_override("shadow_offset_y",2)
 l.position=pos
 l.size.x=width
 l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 parent.add_child(l)
 return l

func bar(pos: Vector2,color: Color) -> ProgressBar:
 var b:=ProgressBar.new()
 b.position=pos
 b.size=Vector2(215,7)
 b.custom_minimum_size=Vector2(215,7)
 var background:=StyleBoxFlat.new()
 background.bg_color=Color("253441")
 b.add_theme_stylebox_override("background",background)
 b.show_percentage=false
 var fill:=StyleBoxFlat.new()
 fill.bg_color=color
 b.add_theme_stylebox_override("fill",fill)
 ui.add_child(b)
 return b

func setup_ui() -> void:
 ui=CanvasLayer.new()
 add_child(ui)
 for rectangle in [Rect2(18,88,248,165),Rect2(849,80,405,85),Rect2(18,525,704,90)]:
  var backing:=ColorRect.new()
  backing.position=rectangle.position
  backing.size=rectangle.size
  backing.color=Color(.018,.033,.054,.75)
  backing.mouse_filter=Control.MOUSE_FILTER_IGNORE
  ui.add_child(backing)
 label(ui,"ULTIMATEMAN",24,Vector2(32,24))
 label(ui,"NATIVE BUILD · FIRST RESPONSE",11,Vector2(32,56))
 label(ui,"VITAL SIGNS",12,Vector2(32,100))
 health_bar=bar(Vector2(32,122),Color("73dfb1"))
 label(ui,"DRAGON AURA",12,Vector2(32,145))
 aura_bar=bar(Vector2(32,167),Color("e9b267"))
 objective=label(ui,"",18,Vector2(865,95),380)
 status=label(ui,"",12,Vector2(32,195),310)
 dialogue=label(ui,"",17,Vector2(32,540),670)
 message=label(ui,"",20,Vector2(330,165),680)
 label(ui,"WASD  MOVE    MOUSE  CAMERA    SHIFT  SPRINT    SPACE  JUMP / GLIDE    Q  ROOFTOP LEAP\nE  WALL GRIP / INTERACT    CLICK/F  ATTACK    1/2/3  ELEMENTS    C  DODGE    R  AURA    ESC  PAUSE",11,Vector2(280,665),950)
 boss_name=label(ui,"",14,Vector2(430,72),450)
 boss_bar=bar(Vector2(430,96),Color("e75b82"))
 boss_bar.size.x=420
 boss_bar.max_value=450
 boss_bar.hide()
 menu=Control.new()
 ui.add_child(menu)
 var shade:=ColorRect.new()
 shade.color=Color(0.025,.04,.065,.84)
 shade.size=Vector2(1280,720)
 menu.add_child(shade)
 label(menu,"AN ORIGINAL SUPERHERO STORY",13,Vector2(85,130))
 label(menu,"FIRST\nRESPONSE.",76,Vector2(80,180),750)
 menu_story=label(menu,"Elias Reed never asked for these powers.\nTonight, a stolen dragon core pulls him into a city-wide conspiracy.\nBe the first to answer.",18,Vector2(85,380),850)
 var start:=Button.new()
 start.text="START CHAPTER ONE  →"
 start.position=Vector2(85,500)
 start.size=Vector2(325,55)
 start.pressed.connect(start_game)
 menu.add_child(start)
 var boss:=Button.new()
 boss.text="PLAY THE WARDEN ENCOUNTER"
 boss.position=Vector2(85,575)
 boss.size=Vector2(325,45)
 boss.pressed.connect(start_boss)
 menu.add_child(boss)
 var exit_button:=Button.new()
 exit_button.text="QUIT"
 exit_button.position=Vector2(1090,650)
 exit_button.size=Vector2(140,35)
 exit_button.pressed.connect(get_tree().quit)
 menu.add_child(exit_button)
 label(menu,"WINDOWS NATIVE PROTOTYPE · GODOT 4.6.3",11,Vector2(85,650))

func start_game() -> void:
 for e in enemies:
  if is_instance_valid(e):e.queue_free()
 enemies.clear()
 hp=100
 aura=0
 witness_hp=100
 ambush_spawned=false
 stage=0
 hero.global_position=Vector3(0,.05,18)
 hero.velocity=Vector3.ZERO
 hero.zip_time=0
 hero.dodge_time=0
 hero.dodge_cooldown=0
 hero.climbing=false
 shot_cooldown=0
 leap_cooldown=0
 for shot in shots:shot.node.queue_free()
 shots.clear()
 hero.enabled=true
 playing=true
 marker.position=targets[0]+Vector3.UP*.1
 marker.show()
 menu.hide()
 boss_bar.hide()
 boss_name.text=""
 courier.hide()
 transmitter.show()
 for w in witnesses:w.hide()
 Input.mouse_mode=Input.MOUSE_MODE_CAPTURED
 say("MIRA VALE","Elias? The scanner is blowing up. Someone is using dragon tech on East Ninth. Get there.")

func start_boss() -> void:
 start_game()
 stage=6
 aura=100
 marker.hide()
 spawn_enemy(Vector3(0,0,-5),true)
 say("THE WARDEN","Show me what that dragon aura can do, guardian.")

func spawn_enemy(pos: Vector3,boss := false) -> void:
 var enemy:=Enemy.new()
 enemy.game=self
 enemy.boss=boss
 enemy.hp=450 if boss else 75
 enemy.position=pos
 add_child(enemy)
 enemies.append(enemy)
 if boss:boss_bar.show()

func next_stage() -> void:
 stage+=1
 hp=minf(100,hp+20)
 marker.position=targets[stage]+Vector3.UP*.1
 marker.show()
 match stage:
  1:say("ULTIMATEMAN","I can hear the sirens. These powers are still new. But I can't stand by.")
  2:
   courier.show()
   courier.position=Vector3(0,0,-120)
   courier_leg=0
   marker.hide()
   say("MIRA VALE","That courier has the stolen core. Stay on him! Sprint to close the gap.")
  3:
   courier.hide()
   for w in witnesses:w.show()
   say("COURIER","The Warden paid me. His sentinels are hunting the witnesses. Please—help them.")
  4:say("MIRA VALE","A control signal is coming from that roof. Leap up there, then press E at the transmitter.")
  5:
   transmitter.hide()
   aura=100
   say("THE WARDEN","You think that suit makes you a guardian? Meet me on East Ninth.")
  6:
   marker.hide()
   spawn_enemy(Vector3(0,0,-5),true)
   say("ULTIMATEMAN","You put this city in danger. It ends here.")

func enemy_down(enemy: CharacterBody3D) -> void:
 enemies.erase(enemy)
 aura=minf(100,aura+20)
 tone(100,.15)
 if enemy.boss:finish(true)

func finish(win: bool) -> void:
 playing=false
 hero.enabled=false
 Input.mouse_mode=Input.MOUSE_MODE_VISIBLE
 boss_bar.hide()
 boss_name.text=""
 menu.show()
 menu_story.text="The witnesses are safe. The Warden has fallen.\nBut the stolen dragon core is still missing. Mira has a lead.\nEnd of playable Chapter One." if win else "East Ninth still needs its guardian.\nUse ice to slow attackers, water to heal, and C to dodge the Warden.\nTry again and bring everyone home."
 for child in menu.get_children():
  if child is Label and child.get_theme_font_size("font_size")==76:
   child.text="THE DRAGON\nAWAKENS." if win else "RISE\nAGAIN."
 say("MIRA VALE","The witnesses are safe. But the stolen core is still out there. End of playable Chapter One." if win else "The city still needs you. Try again.")

func damage(amount: float) -> void:
 hp-=amount
 if hp<=0:finish(false)

func say(speaker: String,line: String) -> void:
 dialogue.text=speaker+"\n"+line
 dialogue_time=12

func notify(text: String) -> void:
 message.text=text
 notice_time=2

func tone(frequency: float,duration: float) -> void:
 if DisplayServer.get_name()=="headless":return
 var sound:=AudioStreamWAV.new()
 sound.format=AudioStreamWAV.FORMAT_16_BITS
 sound.mix_rate=22050
 var samples:=PackedByteArray()
 samples.resize(int(duration*22050)*2)
 for i in int(duration*22050):
  var amplitude:=int(sin(float(i)*TAU*frequency/22050)*6000*(1-float(i)/(duration*22050)))
  samples.encode_s16(i*2,amplitude)
 sound.data=samples
 var player:=AudioStreamPlayer.new()
 player.stream=sound
 player.volume_db=-12
 add_child(player)
 player.finished.connect(player.queue_free)
 player.play()

func shoot() -> void:
 shot_cooldown=.18 if power==0 else .36
 hero.attack_time=.32
 var origin:Vector3=hero.global_position+Vector3.UP*1.2
 var direction:Vector3=-camera.global_basis.z
 var nearest:CharacterBody3D=null
 var distance:=65.0
 for e in enemies:
  var d:float=e.global_position.distance_to(origin)
  if d<distance:nearest=e;distance=d
 if nearest:direction=(nearest.global_position+Vector3.UP*1.2-origin).normalized()
 var projectile:=MeshInstance3D.new()
 var sphere:=SphereMesh.new()
 sphere.radius=.10 if power==0 else .18
 sphere.height=sphere.radius*2
 projectile.mesh=sphere
 projectile.material_override=material(["ffc46b","52c9f7","c3efff"][power],true)
 projectile.position=origin
 add_child(projectile)
 shots.append({"node":projectile,"dir":direction,"life":1.4,"power":power})
 tone([550,230,900][power],.09)

func roof_leap() -> void:
 if leap_cooldown>0:return
 var forward:Vector3=-camera.global_basis.z
 forward.y=0
 forward=forward.normalized()
 var closest:Dictionary={}
 var distance:=125.0
 for b in buildings:
  var delta:=Vector3(b.x,hero.global_position.y,b.z)-hero.global_position
  if delta.length()>5 and delta.length()<distance and delta.normalized().dot(forward)>.25:
   closest=b
   distance=delta.length()
 if not closest.is_empty():
  hero.leap(Vector3(closest.x,closest.h+2,closest.z))
  leap_cooldown=4
  notify("DRAGON STEP — ROOFTOP LEAP")
 else:notify("FACE A NEARBY BUILDING TO LEAP")

func _unhandled_input(event: InputEvent) -> void:
 if event is InputEventKey and event.pressed and event.keycode==KEY_ESCAPE:
  if menu.visible:return
  playing=not playing
  hero.enabled=playing
  Input.mouse_mode=Input.MOUSE_MODE_CAPTURED if playing else Input.MOUSE_MODE_VISIBLE
  notify("PAUSED — ESC TO RESUME" if not playing else "RESUMED")
 if not playing:return
 if event is InputEventMouseMotion and Input.mouse_mode==Input.MOUSE_MODE_CAPTURED:
  yaw-=event.relative.x*.003
  pitch=clampf(pitch+event.relative.y*.002,-.3,.85)
 if event is InputEventKey and event.pressed and not event.echo:
  if event.keycode in [KEY_1,KEY_2,KEY_3]:power=event.keycode-KEY_1
 if event.is_action_pressed("climb"):
  if stage==4 and hero.global_position.distance_to(targets[4])<7:next_stage()
  else:hero.climbing=not hero.climbing
 if event.is_action_pressed("leap"):roof_leap()
 if event.is_action_pressed("dodge"):hero.dodge()
 if event.is_action_pressed("aura") and aura>=100:
  aura=0
  for e in enemies.duplicate():
   if is_instance_valid(e) and e.global_position.distance_to(hero.global_position)<30:e.hit(120,power)
  ring(hero.global_position,10,Color("ffc46b"))

func _process(delta: float) -> void:
 if not is_instance_valid(hero) or not is_instance_valid(objective):return
 elapsed+=delta
 notice_time=maxf(0,notice_time-delta)
 dialogue_time=maxf(0,dialogue_time-delta)
 message.visible=notice_time>0
 dialogue.visible=dialogue_time>0
 var target:Vector3=hero.global_position+Vector3.UP*1.25
 var offset:=Vector3(sin(yaw)*cos(pitch)*4,1.2+sin(pitch)*4,cos(yaw)*cos(pitch)*4)
 var desired:=target+offset
 var query:=PhysicsRayQueryParameters3D.create(target,desired)
 query.exclude=[hero.get_rid()]
 var hit:=get_world_3d().direct_space_state.intersect_ray(query)
 if not hit.is_empty():desired=hit.position+(target-hit.position).normalized()*.3
 camera.global_position=camera.global_position.lerp(desired,1-exp(-delta*10))
 camera.look_at(target)
 if not playing:return
 shot_cooldown=maxf(0,shot_cooldown-delta)
 leap_cooldown=maxf(0,leap_cooldown-delta)
 for car in cars:
  car.position.z+=10*delta
  if car.position.z>240:car.position.z=-240
 if Input.is_action_pressed("attack") and shot_cooldown<=0:shoot()
 for shot in shots.duplicate():
  var pos:Vector3=shot.node.position
  var next:Vector3=pos+shot.dir*75*delta
  var q:=PhysicsRayQueryParameters3D.create(pos,next)
  q.exclude=[hero.get_rid()]
  var collision:=get_world_3d().direct_space_state.intersect_ray(q)
  shot.node.position=next
  shot.life-=delta
  if not collision.is_empty():
   var victim=collision.collider
   if victim is CharacterBody3D and victim.has_method("hit"):
    victim.hit(32 if shot.power==0 else 25,shot.power)
    if shot.power==1:hp=minf(100,hp+4)
   shot.life=0
  if shot.life<=0 or not collision.is_empty():
   shot.node.queue_free()
   shots.erase(shot)
 if stage==0 and hero.global_position.distance_to(targets[0])<7:next_stage()
 elif stage==1 and hero.global_position.distance_to(targets[1])<12:next_stage()
 elif stage==2:
  var direction:Vector3=courier_path[courier_leg]-courier.position
  if direction.length()<2:courier_leg=(courier_leg+1)%courier_path.size()
  else:
   courier.position+=direction.normalized()*10*delta
   courier.rotation.y=atan2(direction.x,direction.z)
  if hero.global_position.distance_to(courier.position)<3:next_stage()
 elif stage==3:
  if not ambush_spawned and hero.global_position.distance_to(targets[3])<22:
   ambush_spawned=true
   for enemy_offset in [Vector3(-6,0,-6),Vector3(6,0,-6),Vector3(-6,0,6),Vector3(6,0,6)]:spawn_enemy(targets[3]+enemy_offset)
  if witness_hp<=0:finish(false)
  elif ambush_spawned and enemies.is_empty() and hero.global_position.distance_to(targets[3])<15:next_stage()
 elif stage==5 and hero.global_position.distance_to(targets[5])<8:next_stage()
 objective.text=mission_names[stage]+"\n"+str(int(hero.global_position.distance_to(courier.position if stage==2 else targets[stage])))+" m · CHAPTER ONE"
 health_bar.value=hp
 aura_bar.value=aura
 status.text=["ELECTRICITY","WATER","ICE"][power]+"\n"+("WALL GRIP ON" if hero.climbing else "WALL GRIP OFF")+"\n"+("Q · DRAGON STEP READY" if leap_cooldown<=0 else "DRAGON STEP · "+str(snappedf(leap_cooldown,.1))+"s")
