# -*- encoding: utf-8 -*-
require File.expand_path('../lib/autovalidator/rails/version', __FILE__)

Gem::Specification.new do |s|
  s.name        = "autovalidator-rails"
  s.version     = Autovalidator::Rails::VERSION
  s.platform    = Gem::Platform::RUBY
  s.authors     = ["Jesse Reiss"]
  s.email       = ["jessereiss@gmail.com"]
  s.homepage    = "http://github.com/thegorgon/autovalidator-rails"
  s.summary     = %q{Gem wrapper to include the Autovalidator.js library via the asset pipeline.}
  s.description = %q{Simple enough}

  s.rubyforge_project = "autovalidator-rails"
  
  s.add_development_dependency "rails", ">= 3.1.0.rc4"
  
  s.files = %w(README.md) + Dir["lib/**/*", "vendor/**/*"]

  s.require_paths = ["lib"]
end