extends SceneTree
var failures: Array[String] = []
func check(condition: bool,message: String) -> void:
 if not condition:failures.append(message);push_error(message)
func frames(count: int) -> void:
 for i in count:await process_frame
func _initialize() -> void:
 call_deferred("run")
func run() -> void:
 var game=load("res://main.tscn").instantiate()
 if not game.has_method("start_game"):
  push_error("Game script failed to load")
  game.free()
  quit(1)
  return
 root.add_child(game)
 await frames(3)
 check(game.buildings.size()==49,"City geometry loaded")
 check(game.hero.animation!=null,"Character animation player imported")
 var clips=game.hero.animation.get_animation_list()
 for expected in ["Idle","Run","Jump","Attack"]:
  var found=false
  for clip in clips:
   if expected in clip:found=true
  check(found,"Animation imported: "+expected)
 game.start_game()
 await frames(5)
 var before:Vector3=game.hero.global_position
 Input.action_press("forward")
 await frames(50)
 Input.action_release("forward")
 check(game.hero.global_position.z<before.z-1,"Keyboard movement advances hero")
 Input.action_press("jump")
 await frames(2)
 Input.action_release("jump")
 check(game.hero.velocity.y>0,"Super jump launches hero")
 game.hero.enabled=false
 game.hero.global_position=game.targets[0]
 await frames(2)
 check(game.stage==1,"Distress response advances story")
 game.hero.global_position=game.targets[1]
 await frames(2)
 check(game.stage==2,"Robbery starts courier chase")
 var courier_before:Vector3=game.courier.position
 await frames(10)
 check(game.courier.position.distance_to(courier_before)>0,"Courier moves during pursuit")
 game.hero.global_position=game.courier.position
 await frames(2)
 check(game.stage==3,"Courier capture spawns witness battle")
 check(game.enemies.is_empty(),"Witness battle waits for player arrival")
 game.hero.global_position=game.targets[3]
 await frames(2)
 check(game.enemies.size()==4,"Four sentinels spawn when player arrives")
 game.power=2
 Input.action_press("attack")
 await frames(900)
 Input.action_release("attack")
 check(game.stage==4,"Elemental attacks defeat guards and rescue witnesses")
 game.hero.global_position=game.targets[4]
 var interact:=InputEventAction.new()
 interact.action="climb"
 interact.pressed=true
 game._unhandled_input(interact)
 check(game.stage==5,"Transmitter interaction advances chapter")
 game.hero.global_position=game.targets[5]
 await frames(2)
 check(game.stage==6,"Warden confrontation starts")
 var boss=game.enemies[0]
 check(boss.boss and boss.hp==450,"Warden spawned with boss health")
 boss.hp=200
 await frames(2)
 check(boss.enraged,"Boss enters second phase")
 boss.cooldown=0
 await frames(2)
 check(boss.windup>0 and is_instance_valid(boss.warning),"Boss strike is telegraphed")
 boss.windup=.01
 boss.strike=game.hero.global_position
 game.hero.dodge_time=.2
 var hp_before:float=game.hp
 await frames(2)
 check(game.hp==hp_before,"Dodge prevents telegraphed strike damage")
 Input.action_press("attack")
 await frames(700)
 Input.action_release("attack")
 check(not game.playing and game.menu.visible,"Boss defeat completes chapter")
 game.start_boss()
 check(game.stage==6 and game.enemies.size()==1,"Direct boss mode works")
 game.hero.enabled=false
 game.hero.global_position=Vector3(0,2,18)
 game.yaw=0
 game.roof_leap()
 check(game.hero.zip_time>0,"Dragon step finds a rooftop")
 game.hero.enabled=true
 await frames(65)
 check(game.hero.global_position.y>15,"Dragon step reaches roof height")
 game.queue_free()
 await frames(2)
 if failures.is_empty():print("NATIVE SMOKE PASSED: rig clips, movement, jump, pursuit, combat, rescue, rooftop interaction, boss phases, dodge, ending, rooftop leap");quit(0)
 else:print("NATIVE SMOKE FAILED: ",failures);quit(1)
