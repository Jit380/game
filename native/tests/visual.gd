extends SceneTree
func _initialize() -> void:call_deferred("run")
func run() -> void:
 var game=load("res://main.tscn").instantiate()
 root.add_child(game)
 for i in 10:await process_frame
 game.start_game()
 game.hero.enabled=false
 game._process(.01)
 game.set_process(false)
 game.hero.avatar.rotation.y=0
 game.hero.play_animation("Idle")
 game.camera.global_position=game.hero.global_position+Vector3(1.1,1.75,3.8)
 game.camera.look_at(game.hero.global_position+Vector3.UP*1.15)
 await RenderingServer.frame_post_draw
 var image=root.get_texture().get_image()
 image.save_png("/tmp/ultimateman-native.png")
 print("Saved native gameplay render")
 game.queue_free()
 await process_frame
 quit()
