extends CharacterBody3D

var enabled := false
var camera: Camera3D
var avatar: Node3D
var animation: AnimationPlayer
var move_direction := Vector3.ZERO
var climbing := false
var dodge_time := 0.0
var dodge_cooldown := 0.0
var zip_time := 0.0
var zip_from := Vector3.ZERO
var zip_to := Vector3.ZERO
var attack_time := 0.0

func _ready() -> void:
 var collider := CollisionShape3D.new()
 var capsule := CapsuleShape3D.new()
 capsule.radius = .28
 capsule.height = 1.8
 collider.shape = capsule
 collider.position.y = .9
 add_child(collider)
 avatar = preload("res://assets/ultimateman.glb").instantiate()
 add_child(avatar)
 animation = avatar.find_child("AnimationPlayer", true, false) as AnimationPlayer
 if animation:
  for clip in animation.get_animation_list():
   if not "Attack" in clip:
    animation.get_animation(clip).loop_mode = Animation.LOOP_LINEAR

func play_animation(name: String) -> void:
 if not animation: return
 for clip in animation.get_animation_list():
  if name in clip and animation.current_animation != clip:
   animation.play(clip, .12)
   return

func leap(target: Vector3) -> void:
 if zip_time > 0: return
 zip_from = global_position
 zip_to = target
 zip_time = 1.0
 velocity = Vector3.ZERO

func dodge() -> void:
 if dodge_cooldown > 0: return
 dodge_time = .35
 dodge_cooldown = 1.4
 if move_direction.length() < .1:
  move_direction = -camera.global_basis.z
  move_direction.y = 0
  move_direction = move_direction.normalized()

func _physics_process(delta: float) -> void:
 if not enabled: return
 dodge_cooldown = maxf(0, dodge_cooldown - delta)
 attack_time = maxf(0, attack_time - delta)
 if zip_time > 0:
  zip_time = maxf(0, zip_time - delta)
  var t := 1.0 - zip_time
  global_position = zip_from.lerp(zip_to,t) + Vector3.UP * sin(t * PI) * 12.0
  play_animation("Jump")
  return
 var input := Input.get_vector("left", "right", "forward", "back")
 var forward := -camera.global_basis.z
 forward.y = 0
 forward = forward.normalized()
 var right := camera.global_basis.x
 right.y = 0
 var desired := (forward * -input.y + right * input.x).normalized()
 var speed := 15.0 if Input.is_action_pressed("sprint") else 7.0
 if dodge_time > 0:
  dodge_time = maxf(0, dodge_time - delta)
  desired = move_direction
  speed = 28
 else: move_direction = desired
 velocity.x = move_toward(velocity.x, desired.x*speed, delta*45)
 velocity.z = move_toward(velocity.z, desired.z*speed, delta*45)
 if is_on_floor():
  velocity.y = -1
  if Input.is_action_just_pressed("jump"):
   velocity.y = 45 if Input.is_action_pressed("sprint") else 30
 elif climbing and is_on_wall() and desired.length() > .1:
  velocity.y = 14
 else:
  velocity.y -= 32*delta
  if Input.is_action_pressed("jump") and velocity.y < -6: velocity.y = -6
 move_and_slide()
 if desired.length() > .1:
  avatar.rotation.y = lerp_angle(avatar.rotation.y, atan2(desired.x,desired.z),delta*12)
 if attack_time>0: play_animation("Attack")
 elif not is_on_floor(): play_animation("Jump")
 elif desired.length()>.1: play_animation("Run")
 else: play_animation("Idle")
