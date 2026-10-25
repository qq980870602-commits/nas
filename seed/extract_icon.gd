extends SceneTree
func _initialize():
 if not ProjectSettings.load_resource_pack(OS.get_environment("GAME_PCK"),false):
  quit(1);return
 var bytes:=FileAccess.get_file_as_bytes("res://icon.png")
 if bytes.is_empty():
  quit(2);return
 var file:=FileAccess.open(OS.get_environment("GAME_ICON"),FileAccess.WRITE)
 file.store_buffer(bytes);file.close();quit()
