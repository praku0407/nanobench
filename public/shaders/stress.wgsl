@group(0) @binding(0) var<storage, read_write> data: array<f32>;

// Dispatch to 64 threads per workgroup
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  
  // Prevent out-of-bounds memory access
  if (index >= arrayLength(&data)) {
    return;
  }

  var value = data[index];
  
  // Artificial heavy workload (Trigonometry is very expensive on GPUs)
  for (var i = 0u; i < 250u; i = i + 1u) {
    value = sin(value) * cos(value) + tan(value) * 0.5;
    value = sqrt(abs(value)) * 1.5;
  }
  
  data[index] = value;
}